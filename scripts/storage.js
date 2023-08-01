import { testing } from '/scripts/testing.js'

const storageKey = testing ? 'snoozedPages_test' : 'snoozedPages'


/*
Plan for new data structure.

Goals:
- Minimize size of each API call to below 8kb
- Minimize size of total storage under 102,4kB
- Provide scalability to dozens/hundreds of sleeping tabs
- Minimize amount of API calls to under 1800/h and 120/min
- Minimize the amount of items in db to under 512

snoozify_dates = [
	'20230816'
] // array of possible dates, probably isostring

for each date in the list:
~100B each page for date -> call limit ~80 per date
snoozify_20230816 = [
	{
		page_title: 'Provide scalability to dozens/hundreds of sleeping tabs',
		page_hash: 123456	
	}
] // array of all pages to be woken up on that day

For each page:
an object to contain all of the relevant metadata 
(~350B each, total storage supports max ~300 of these objects)
snoozify_page_123456 = {
	page_title: 'Provide scalability to dozens/hundreds of sleeping tabs',
	page_url: 'Provide scalability to dozens/hundreds of sleeping tabs' // Trim URLs to be short?
	page_hash: 123456,
	last_wake: date,
	num_snoozes: 1,
	snooze_period: 30 days
} // 

*/


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