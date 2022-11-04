const WEEKDAYS = {
	'MON': 1,
	'TUE': 2,
	'WED': 3,
	'THU': 4,
	'FRI': 5,
	'SAT': 6,
	'SUN': 0,
}

/*
	Main functions
*/

const openPageById = id => {
	getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);
		chrome.tabs.create({
			url: page.url
		})
	})
}

const snoozePages = (pages) => {
	return getSnoozedPages().then(snoozedPages => {
		pages.forEach(page => snoozedPages.push({
			id: getUID(),
			wakeUpDate: page.wakeUpDate.toISOString(),
			title: page.title,
			url: page.url,
		}))

		return setSnoozedPages(snoozedPages)
	})
}

/*
	Building the UI
*/

const initializeWeekDayButtons = () => {
	const buttonContainer = document.querySelector('#buttons')
	buttonContainer.innerHTML = ''

	getNextWeekdaysFromToday()
	.map(getSnoozeButton(document.querySelector('#datebutton').content))
	.forEach(button => buttonContainer.appendChild(button))
}

const getSnoozeButton = buttonTemplate => weekday => {
	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}

	const button = buttonTemplate.cloneNode(true)

	button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
	button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
	button.children[0].setAttribute('value', weekday.toISOString())
	// button.addEventListener('click', getSnoozeButtonFunction(weekday))

	return button
}

const getSnoozeButtonFunction = date => async () => {
	date.setHours(8, 0, 0, 0)

	const tabs = await chrome.tabs.query({highlighted: true, currentWindow: true})
	const pages = tabs.map(tab => ({
		title: tab.title,
		url: tab.url,
		wakeUpDate: date,
	}))
	
	snoozePages(pages)
	chrome.tabs.remove(tabs.map(tab => tab.id))
}

const initializeHistory = () => {
	getSnoozedPages()
	.then(snoozedPages => {
		const pageLinksElement = document.querySelector('#page-links')
		pageLinksElement.innerHTML = ''

		if (snoozedPages.length === 0) {
			pageLinksElement.innerHTML = 'No snoozed pages yet.'
		}

		snoozedPages
		.sort(byDate)
		.filter(page => page.openedDate === undefined)
		.map(getPageElement)
		.forEach(pageLink => pageLinksElement.appendChild(pageLink))
	})
}

const getPageElement = page => {
	const pageLink = document.querySelector('#page-link-template').content.cloneNode(true)
	const dateFormatOptions = {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: false}

	pageLink.querySelector('.page-link__url').href = page.url
	pageLink.querySelector('.page-link__title').textContent = page.title
	pageLink.querySelector('.page-link__wakeupdate').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(new Date(page.wakeUpDate))
	pageLink.querySelector('.page-link__wakeup-button').addEventListener('click', getWakeupButtonFunction(page.id))
	return pageLink
}

const getWakeupButtonFunction = id => async () => {
	openPageById(id)
	setPageValue(id, 'openedDate', (new Date().toISOString()))
}

/*
	Storage access
*/

const clearSnoozedPages = () => chrome.storage.local.set({'snoozedPages': []})

const getSnoozedPages = () => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.get({'snoozedPages': []}, result => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				}

				resolve(result.snoozedPages)
			})
		} catch (error) {
			reject(error)
		}
		
	})
	
}

const setSnoozedPages = snoozedPages => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.set({'snoozedPages': snoozedPages}, result => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				}

				resolve(result)
			})
		} catch (error) {
			reject(error)
		}
	})
}

const setPageValue = (id, field, value) => {
	getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);
		page[field] = value

		chrome.storage.local.set({'snoozedPages': snoozedPages})
	})
}

/* 
	Utilities
*/

const byDate = (page1, page2) => new Date(page1.wakeUpDate) - new Date(page2.wakeUpDate)

// getUID function from https://dev.to/rahmanfadhil/how-to-generate-unique-id-in-javascript-1b13#comment-1ol48
const getUID = () => String(
	Date.now().toString(32) + Math.random().toString(16)
	).replace(/\./g, '')


const trace = string => object => {
	console.log(string, object)
	return object
}

const getNextWeekdayFromDate = (date, weekday) => {
	const currentWeekday = date.getDay(); // 0 (Sun) - 6 (sat)
	let daysToAdvance = (weekday - currentWeekday)

	if (daysToAdvance <= 0) {
		daysToAdvance = daysToAdvance + 7
	}

	const newDate = new Date()
	newDate.setUTCDate(date.getUTCDate() + daysToAdvance)

	return newDate;
}

const getNextWeekdaysFromToday = () => Object.keys(WEEKDAYS).map(weekday => getNextWeekdayFromDate(new Date(), WEEKDAYS[weekday]))


/*
	Run the extension
*/

document.addEventListener("DOMContentLoaded", () => {
	// initialize main popup page
	if (window.location.href.match('popup.html')) {
		initializeWeekDayButtons()

		Array.from(document.querySelector('#buttons').children).forEach(child => child.addEventListener('click', getSnoozeButtonFunction(new Date(child.value))))
	}

	// initialize history page
	if (window.location.href.match('history.html')) {
		initializeHistory()

		document.querySelector('#clear-button').addEventListener('click', () => {
			clearSnoozedPages()
			initializeHistory()
		})
	}
})
