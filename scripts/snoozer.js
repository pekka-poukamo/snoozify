import SnoozeStore from './snooze-store.js'
import { toWakeDay } from './utils.js'

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

	// One scheduleSnoozes call per wake day; sequential to avoid parallel commits.
	// True single-commit multi-day batch pending scheduleSnoozesBatch in snooze-store.
	const entries = Object.entries(byWakeDay)
	return entries.reduce(
		(chain, [wakeAt, group]) =>
			chain.then(results =>
				SnoozeStore.scheduleSnoozes(group, wakeAt).then(created => [...results, ...created])
			),
		Promise.resolve([])
	)
}

export const openPageById = uid => {
	if (!uid) {
		return Promise.reject('No uid provided')
	}
	return SnoozeStore.wakeSnoozes([uid], 'manual').then(woken => {
		if (woken.length === 0) {
			return Promise.reject(`No snoozed page exists with uid ${uid}`)
		}
		chrome.tabs.create({
			url: woken[0].url
		})
		return uid
	})
}

export const openPagesDueBy = date => {
	const dateMs = typeof date === 'number' ? date : date.getTime()

	return SnoozeStore.getScheduled()
	.then(scheduled => {
		const pagesDue = scheduled.filter(page => Date.parse(page.wakeAt) <= dateMs)

		if (pagesDue.length === 0) {
			return Promise.resolve([])
		}

		const wakeAtById = new Map(pagesDue.map(page => [page.id, page.wakeAt]))

		return SnoozeStore.wakeSnoozes(pagesDue.map(page => page.id), 'scheduled')
			.then(woken => {
				woken.forEach(page => {
					chrome.tabs.create({
						url: page.url
					})
				})
				return woken.map(page => ({
					title: page.title,
					url: page.url,
					uid: page.id,
					wakeUpDate: wakeAtById.get(page.id),
				}))
			})
	})
}

export default {
	snoozePages,
	openPageById,
	openPagesDueBy,
}
