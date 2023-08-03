import Storage from '/scripts/storageNew.js'
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

		const sortedPages = snoozedPages.sort(byDate)
		const groupedPages = sortedPages.reduce((groups, page) => {
			const date = new Date(page.wakeUpDate).toISOString().split('T')[0]
			if (!groups[date]) {
				groups[date] = []
			}
			groups[date].push(page)
			return groups
		}, {})

		Object.entries(groupedPages)
		.forEach(([unformattedDate, pages], index) => {
			const formattedDate = new Date(unformattedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
			const dateGroup = document.querySelector('#date-group-template').content.cloneNode(true)
			dateGroup.querySelector('.date-group__date-text').textContent = formattedDate
			dateGroup.querySelector('.date-group__count').textContent = `${pages.length}`
			const pagesElement = dateGroup.querySelector('.date-group__pages')
			pages
			.filter(page => page.openedDate === undefined)
			.map(getPageElement)
			.forEach(pageLink => pagesElement.appendChild(pageLink))

			if (new Date(unformattedDate).getDay() === 1 && index !== 0) {
				dateGroup.querySelector('h2').classList.add('date-group--monday')
			}

			pageLinksElement.appendChild(dateGroup)
		})
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
}

/* Run the extension */

document.addEventListener("DOMContentLoaded", () => {
	initializeHistory()

	document.querySelector('#clear-button').addEventListener('click', () => {
		Storage.clearSnoozedPages()
		initializeHistory()
	})
})
