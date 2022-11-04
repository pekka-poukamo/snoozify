import Storage from './storage.js'
import { getUID } from './utils.js'

export const snoozePages = pages => {
	if (!pages || pages.length === 0) {
		return Promise.reject('No pages to snooze')
	}

	return Storage.getSnoozedPages().then(snoozedPages => {
		pages.forEach(page => snoozedPages.push({
			id: getUID(),
			wakeUpDate: page.wakeUpDate.toISOString(),
			title: page.title,
			url: page.url,
		}))

		return Storage.setSnoozedPages(snoozedPages)
	})
}

export const openPageById = id => {
	return Storage.getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);

		if (!page) {
			return Promise.reject(`No snoozed page exists with id ${id}`)
		}

		chrome.tabs.create({
			url: page.url
		})	
	})
}

export const openPagesDueBy = date => {
	Storage.getSnoozedPages()
	.then(snoozedPages => {
		const pagesDue = snoozedPages.filter(page => page.openedDate === undefined && Date.parse(page.wakeUpDate) <= date)

		if (!pagesDue) {
			return Promise.resolve({})
		}

		pagesDue.forEach(page => {
			chrome.tabs.create({
				url: page.url
			})
		})

		const currentDate = (new Date).toISOString()

		snoozedPages.forEach(page => {
			if (pagesDue.find(duePage => duePage.id === page.id)) {
				page.openedDate = currentDate
			}
		})

		return Storage.setSnoozedPages(snoozedPages)
	})
}

export default {
	snoozePages,
	openPageById,
	openPagesDueBy,
}