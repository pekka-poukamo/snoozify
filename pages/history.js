import Storage from '/scripts/storage.js'
import { byDate } from '/scripts/utils.js'
import { openPageById } from '/scripts/snoozer.js'

const initializeHistory = () => {
	Storage.getSnoozedPages()
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

	console.log(page)
	pageLink.querySelector('.page-link__url').href = page.url
	pageLink.querySelector('.page-link__title').textContent = page.title
	pageLink.querySelector('.page-link__wakeupdate').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(new Date(page.wakeUpDate))
	pageLink.querySelector('.page-link__wakeup-button').addEventListener('click', getWakeupButtonFunction(page.id))
	return pageLink
}

const getWakeupButtonFunction = id => async () => {
	openPageById(id)
}

/* Run the extension */

document.addEventListener("DOMContentLoaded", () => {
	initializeHistory()

	document.querySelector('#clear-button').addEventListener('click', () => {
		Storage.clearSnoozedPages()
		initializeHistory()
	})
})