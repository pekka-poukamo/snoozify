import { openPagesDueBy } from '/scripts/snoozer.js'

const alarmName = 'Snoozify scheduler'

chrome.alarms.create(alarmName, {
		delayInMinutes: 1,
		periodInMinutes: 1,
	})

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === alarmName) {
		console.log('Snoozify alarm', alarm)
		openPagesDueBy(new Date())
	}
})