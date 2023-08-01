import Storage from './storage.js'
import StorageNew from './storageNew.js'


const printBackUp = () => {
	Storage.getSnoozedPages().then(pages => {
		console.log(JSON.stringify(pages))
	}).then(() => {
		return StorageNew.getSnoozedPages()
	}).then(pages => {
		console.log(JSON.stringify(pages))
	})
}

const addPages = () => {
	Storage.getSnoozedPages().then(pages => {
		return StorageNew.getSnoozedPages().then(newPages => {
			const missingPages = pages.filter(page => !newPages.find(newPage => newPage.uid === page.id))
			.map(missingPage => ({...missingPage, uid: missingPage.id}))

			console.log(missingPages)
			if (missingPages.length > 0) {
				StorageNew.snoozePages(missingPages).then(() => console.log('tööt4', missingPages))
			}
		})
	}).catch(reason => console.error(reason))
}

export default {
	printBackUp,
	addPages,
}