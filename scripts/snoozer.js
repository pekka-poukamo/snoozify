import Storage from './storage.js'
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

export const openPageById = uid => {
	if (!uid) {
		return Promise.reject('No uid provided')
	}
	return Storage.getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.uid === uid);

		if (!page) {
			return Promise.reject(`No snoozed page exists with uid ${uid}`)
		}

		return Storage.removePagesByUIDs([uid]).then(() => {
			chrome.tabs.create({
				url: page.url
			})	
			return Promise.resolve(uid)
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