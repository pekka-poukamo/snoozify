import { snoozePages } from '/scripts/snoozer.js'
import { testing } from '/scripts/testing.js'
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

	Promise.all(
		getNextWeekdaysFromToday({additionalWeek: options.additionalWeek})
		.map(date => getSnoozeButton(document.querySelector('#datebutton').content)(date))
		)
	.then(buttonElements => {
		buttonContainer.innerHTML = ''
		buttonElements.forEach(fragment => {
			const button = fragment.querySelector('button');
			buttonContainer.appendChild(fragment);
			button.addEventListener('click', getSnoozeButtonFunction(new Date(button.value)));
		});
	})
}

const initializeTomorrowButton = () => {
	const tomorrow = new Date(Date.now() + 60*60*24*1000);
	getSnoozeButton(document.querySelector('#datebutton').content)(tomorrow)
	.then(buttonElement => {
		const button = buttonElement.querySelector('button')
		button.querySelector('.datebutton__weekday').textContent = 'Tomorrow'
		button.addEventListener('click', getSnoozeButtonFunction(tomorrow));
		button.setAttribute('id', '#tomorrow-button')
		document.querySelector('#tomorrow-button').replaceWith(button);
	});
}

const initializeMonthButton = async (options = {}) => {

	const buttonContainer = document.querySelector('#special-buttons')
	const buttonTemplate = document.querySelector('#datebutton').content

	const date = new Date()
	date.setDate(date.getDate() + 28 + (options.additionalMonth ? 28 : 0)) // 4 (or 8) weeks in future

	if (date.getDay() !== 1) {
		const day = date.getDay()
		let daysUntilNextMonday = (day > 1) ? (8 - day) : (1 - day);
		date.setDate(date.getDate() + daysUntilNextMonday)
	}

	const button = getSnoozeButton(buttonTemplate)(date)

	Promise.resolve(button)
	.then(buttonElement => {
		buttonElement.firstElementChild.id = 'month-button'
		buttonElement.firstElementChild.classList.remove('future-week')
		buttonElement.querySelector('.datebutton__weekday').textContent = 'Later'
		document.querySelector('#month-button')?.remove()
		buttonContainer.appendChild(buttonElement)
		document.querySelector('#month-button').addEventListener('click', getSnoozeButtonFunction(date))
	})
}



const initializeTestButton = () => {
	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}

	const buttonContainer = document.querySelector('#special-buttons')
	const buttonTemplate = document.querySelector('#datebutton').content
	const button = buttonTemplate.cloneNode(true)

	const now = new Date()
	button.querySelector('.datebutton__weekday').textContent = 'Testing — ' + new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(now)
	button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(now)
	button.firstElementChild.id = 'test-button'

	buttonContainer.appendChild(button)
	document.querySelector('#test-button').addEventListener('click', getSnoozeButtonFunction(now))
}

const getSnoozeButton = buttonTemplate => weekday => {
	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}
	return Storage.getSnoozedPageCount(weekday.toISOString())
	.then(count => {
		const button = buttonTemplate.cloneNode(true)

		button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
		button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
		button.querySelector('.datebutton__count').textContent = `${count}` // Add this line
		button.children[0].setAttribute('value', weekday.toISOString())
		if (!datesSameWeek(weekday, new Date())) {
			button.children[0].classList.add('future-week')
		}

		return button
	})
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
	.then(result => {
		chrome.tabs.remove(tabs.map(tab => tab.id))
	})
	.catch(error => console.error('Snoozing pages failed', error))
}

document.addEventListener("DOMContentLoaded", () => {
	initializeWeekDayButtons()
	initializeTomorrowButton()
	initializeMonthButton()
	
	if (testing) {
		initializeTestButton()
	}

	document.addEventListener('keydown', event => {
		if (event.key === 'Shift') {
			initializeWeekDayButtons({additionalWeek: true})
			initializeMonthButton({additionalMonth: true})
		}
	})

	document.addEventListener('keyup', event => {
		if (event.key === 'Shift') {
			initializeWeekDayButtons({additionalWeek: false})
			initializeMonthButton({additionalMonth: false})
		}
	})
})

