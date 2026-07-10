import SnoozeStore from './snooze-store.js'

const toWakeDay = wakeUpDate => new Date(wakeUpDate).toISOString().split('T')[0]

export const snoozePages = pages => {
	if (!pages || pages.length === 0) {
		return Promise.reject('No pages to snooze')
	}

	const byWakeDay = pages.reduce((groups, page) => {
		const wakeDay = toWakeDay(page.wakeUpDate)
		groups[wakeDay] = groups[wakeDay] || []
		groups[wakeDay].push({ title: page.title, url: page.url })
		return groups
	}, {})

	return Promise.all(
		Object.entries(byWakeDay).map(([wakeAt, group]) =>
			SnoozeStore.scheduleSnoozes(group, wakeAt)
		)
	).then(results => results.flat())
}

export const openPageById = uid => {
	if (!uid) {
		return Promise.reject('No uid provided')
	}
	return SnoozeStore.getScheduled().then(scheduled => {
		const page = scheduled.find(entry => entry.id === uid)

		if (!page) {
			return Promise.reject(`No snoozed page exists with uid ${uid}`)
		}

		return SnoozeStore.wakeSnoozes([uid], 'manual').then(() => {
			chrome.tabs.create({
				url: page.url
			})
			return Promise.resolve(uid)
		})
	})
}

export const openPagesDueBy = date => {
	const dateMs = typeof date === 'number' ? date : date.getTime()

	return SnoozeStore.getScheduled()
	.then(scheduled => {
		const pagesDue = scheduled.filter(page => Date.parse(page.wakeAt) <= dateMs)

		if (!pagesDue || pagesDue.length === 0) {
			return Promise.resolve([])
		}

		return SnoozeStore.wakeSnoozes(pagesDue.map(page => page.id), 'scheduled')
			.then(() => {
				pagesDue.forEach(page => {
					chrome.tabs.create({
						url: page.url
					})
				})
				return Promise.resolve(pagesDue.map(page => ({
					title: page.title,
					url: page.url,
					uid: page.id,
					wakeUpDate: page.wakeAt,
				})))
			})
	})
}

export default {
	snoozePages,
	openPageById,
	openPagesDueBy,
}
