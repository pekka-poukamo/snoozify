import { snoozePages } from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'
import {
	getUID,
	trace,
	getNextWeekdayFromDate,
	getNextWeekdaysFromToday,
	byDate,
	datesSameWeek,
} from '/scripts//utils.js'


const initializeWeekDayButtons = (options = {}) => {
	const buttonContainer = document.querySelector('#buttons')
	buttonContainer.innerHTML = ''

	getNextWeekdaysFromToday({additionalWeek: options.additionalWeek})
	.map(getSnoozeButton(document.querySelector('#datebutton').content))
	.forEach(button => buttonContainer.appendChild(button))
	Array.from(document.querySelector('#buttons').children).forEach(child => child.addEventListener('click', getSnoozeButtonFunction(new Date(child.value))))
}

const getSnoozeButton = buttonTemplate => weekday => {
	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}

	const button = buttonTemplate.cloneNode(true)

	button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
	button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
	button.children[0].setAttribute('value', weekday.toISOString())
	if (!datesSameWeek(weekday, new Date())) {
		button.children[0].classList.add('future-week')
	}

	return button
}



const getSnoozeButtonFunction = date => async () => {
	date.setHours(8, 0, 0, 0)

	const tabs = await chrome.tabs.query({highlighted: true, currentWindow: true})
	const pages = tabs.map(tab => ({
		title: tab.title,
		url: tab.url,
		wakeUpDate: date,
	}))
	
	snoozePages(pages)
	.then(result => chrome.tabs.remove(tabs.map(tab => tab.id)))
}

document.addEventListener("DOMContentLoaded", () => {
	initializeWeekDayButtons()

	document.addEventListener('keydown', event => {
		if (event.key === 'Shift') {
			initializeWeekDayButtons({additionalWeek: true})
		}
	})

	document.addEventListener('keyup', event => {
		if (event.key === 'Shift') {
			initializeWeekDayButtons({additionalWeek: false})
		}
	})
})

