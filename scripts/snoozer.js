import Storage from './storageNew.js'
import { getUID } from './utils.js'

export const snoozePages = pages => {
	if (!pages || pages.length === 0) {
		return Promise.reject('No pages to snooze')
	}

	const storagePages = pages.map(page => {
		return {
			...page,
			uid: getUID()
		}
	})

	return Storage.snoozePages(storagePages)
}

export const openPageById = id => {
	return Storage.getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);

		if (!page) {
			return Promise.reject(`No snoozed page exists with id ${id}`)
		}

		return Storage.removePagesByUIDs([id]).then(() => {
			chrome.tabs.create({
				url: page.url
			})	
			return Promise.resolve(id)
		})
	})
}

export const openPagesDueBy = date => {
	return Storage.getSnoozedPages()
	.then(snoozedPages => {
		const pagesDue = snoozedPages.filter(page => page.openedDate === undefined && Date.parse(page.wakeUpDate) <= date)

		if (!pagesDue || pagesDue.length === 0) {
			return Promise.resolve([])
		}

		pagesDue.forEach(page => {
			chrome.tabs.create({
				url: page.url
			})
		})
		
		return Storage.removePagesByUIDs(pagesDue.map(page => page.uid)).then(() => Promise.resolve(pagesDue))
	})
}

export default {
	snoozePages,
	openPageById,
	openPagesDueBy,
}