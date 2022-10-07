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
	// date.setTime(8*60*60*1000) // TODO fix to take local time into account

	date.setHours(8, 0, 0, 0)

	console.log('click', date)

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
		button.querySelector('.datebutton__date').textContent =  new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
		button.children[0].setAttribute('value', weekday.toISOString())
		// button.addEventListener('click', getClickFunction(weekday))

		return button
	}).forEach(button => document.querySelector('#buttons').appendChild(button))
}

const initializeHistory = () => {
	chrome.storage.local.get({'snoozedPages': []}, result => {
		const pageLinksElement = document.querySelector('#page-links')
		pageLinksElement.innerHTML = ''

		if (result.snoozedPages.length === 0) {
			pageLinksElement.innerHTML = 'No snoozed pages yet.'
		}
		result.snoozedPages.map(page => {
			const pageLink = document.querySelector('#page-link-template').content.cloneNode(true)

			pageLink.querySelector('.page-link__url').href = page.url
			pageLink.querySelector('.page-link__title').textContent = page.title
			pageLink.querySelector('.page-link__wakeupdate').textContent = page.wakeUpDate
			return pageLink
		}).forEach(pageLink => pageLinksElement.appendChild(pageLink))
	})
}


const snoozePages = (pages) => {
	chrome.storage.local.get({'snoozedPages': []}, (result) => {
		const snoozedPages = result.snoozedPages

		pages.forEach(page => snoozedPages.push({
			id: Math.random(), // TODO get proper id in place
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
