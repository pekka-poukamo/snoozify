import { openPagesDueBy } from '/scripts/snoozer.js'
import SnoozeStore from '/scripts/snooze-store.js'

const alarmName = 'Snoozify scheduler'

let pageLaunchInProgress = false
const migrateReady = SnoozeStore.migrate().catch(error => {
	console.error('SnoozeStore migration failed:', error)
})

export const ensureSchedulerAlarm = () => new Promise(resolve => {
	chrome.alarms.get(alarmName, alarm => {
		if (!alarm) {
			chrome.alarms.create(alarmName, {
				delayInMinutes: 0,
				periodInMinutes: 1,
			})
		}
		resolve()
	})
})

ensureSchedulerAlarm()

chrome.runtime.onInstalled.addListener(() => {
	migrateReady.catch(() => {})
})

chrome.alarms.onAlarm.addListener(alarm => {
if (alarm.name === alarmName && !pageLaunchInProgress) {
		console.log('Snoozify alarm', alarm)
		pageLaunchInProgress = true;
		migrateReady
		.then(() => openPagesDueBy(new Date()))
		.then(pagesOpened => {
			launchPageOpenNotification(pagesOpened)
			pageLaunchInProgress = false
		})
		.catch(error => {
			pageLaunchInProgress = false
			return Promise.reject(error)
		})
	}
})

const launchPageOpenNotification = pagesOpened => {
	if (pagesOpened.length === 0) {
		return
	}

	const plural = pagesOpened.length > 1
	const title = `Snoozify woke up ${plural ? 'pages' : 'a page'}`
	const message = plural ? `${pagesOpened.length} pages` : `${pagesOpened[0].title}.`

	chrome.notifications.create({
		title, message,
		iconUrl: '/assets/icon-128.png',
		type: 'basic',
		silent: true,
	})
}
