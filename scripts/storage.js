const testEnvironment = false // Set to true to use testing data instead of production data
const storageKey = testEnvironment ? 'snoozedPages_test' : 'snoozedPages'

const clearSnoozedPages = () => chrome.storage.sync.set({storageKey: []})

const getSnoozedPages = () => {
	return new Promise((resolve, reject) => {
		try {
			const queryObject = {}
			queryObject[storageKey] = [] // Set default value to empty array

			chrome.storage.sync.get(queryObject, result => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				}
				console.log('getSnoozedPages', result)
				resolve(result[storageKey])
			})
		} catch (error) {
			reject(error)
		}
		
	})
}

const setSnoozedPages = snoozedPages => {
	return new Promise((resolve, reject) => {
		try {
			/* TODO
				Filter pages to limit the size of store operation. As a side effect, loses history.
				Still has an issue that after 25-35 items the store operation fails because of message size exceeding ~8kb
				Need to figure out a way to store larger amount of items. Compression? Lookup tables for metavalues?
			*/
			const filteredPages = snoozedPages.filter(page => page.openedDate === undefined) 
			
			const queryObject = {}
			queryObject[storageKey] = filteredPages // Set default value to empty array

			chrome.storage.sync.set(queryObject, result => {
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
	return getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);
		page[field] = value

		return setSnoozedPages(snoozedPages)
	})
}

export default {
	clearSnoozedPages,
	getSnoozedPages,
	setSnoozedPages,
	setPageValue,
}