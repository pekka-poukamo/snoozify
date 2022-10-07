const WEEKDAYS = {
	'MON': 1,
	'TUE': 2,
	'WED': 3,
	'THU': 4,
	'FRI': 5,
	'SAT': 6,
	'SUN': 0,
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

const getClickFunction = date => async () => {
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


const initializeWeekDayButtons = () => {
	document.querySelector('#buttons').innerHTML = ''

	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}

	getNextWeekdaysFromToday().map(weekday => {
		const button = document.querySelector('#datebutton').content.cloneNode(true)

		button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
		button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
		button.children[0].setAttribute('value', weekday.toISOString())
		// button.addEventListener('click', getClickFunction(weekday))

		return button
	}).forEach(button => document.querySelector('#buttons').appendChild(button))
}

const initializeHistory = () => {
	const dateFormatOptions = {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: false}

	chrome.storage.local.get({'snoozedPages': []}, result => {
		const pageLinksElement = document.querySelector('#page-links')
		pageLinksElement.innerHTML = ''

		if (result.snoozedPages.length === 0) {
			pageLinksElement.innerHTML = 'No snoozed pages yet.'
		}
		result.snoozedPages
		.sort(byDate)
		.map(page => {
			const pageLink = document.querySelector('#page-link-template').content.cloneNode(true)

			pageLink.querySelector('.page-link__url').href = page.url
			pageLink.querySelector('.page-link__title').textContent = page.title
			pageLink.querySelector('.page-link__wakeupdate').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(new Date(page.wakeUpDate))
			return pageLink
		}).forEach(pageLink => pageLinksElement.appendChild(pageLink))
	})
}

// getUID function from https://dev.to/rahmanfadhil/how-to-generate-unique-id-in-javascript-1b13#comment-1ol48
const getUID = () => String(
    Date.now().toString(32) + Math.random().toString(16)
  ).replace(/\./g, '')

const byDate = (page1, page2) => {
	console.log('sort', page1.wakeUpDate, page2.wakeUpDate, new Date(page1.wakeUpDate) - new Date(page2.wakeUpDate))
	return new Date(page1.wakeUpDate) - new Date(page2.wakeUpDate)
}


const snoozePages = (pages) => {


	chrome.storage.local.get({'snoozedPages': []}, (result) => {
		const snoozedPages = result.snoozedPages

		pages.forEach(page => snoozedPages.push({
			id: getUID(),
			wakeUpDate: page.wakeUpDate.toISOString(),
			title: page.title,
			url: page.url,
		}))
		

		chrome.storage.local.set({'snoozedPages': snoozedPages})
	})
}

const clearSnoozedPages = () => chrome.storage.local.set({'snoozedPages': []})


document.addEventListener("DOMContentLoaded", () => {
	// initialize main popup page
	if (window.location.href.match('popup.html')) {
		initializeWeekDayButtons()

		Array.from(document.querySelector('#buttons').children).forEach(child => child.addEventListener('click', getClickFunction(new Date(child.value))))
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
