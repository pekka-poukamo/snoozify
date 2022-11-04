const WEEKDAYS = {
	'MON': 1,
	'TUE': 2,
	'WED': 3,
	'THU': 4,
	'FRI': 5,
	'SAT': 6,
	'SUN': 0,
}

export const byDate = (page1, page2) => new Date(page1.wakeUpDate) - new Date(page2.wakeUpDate)

// getUID function from https://dev.to/rahmanfadhil/how-to-generate-unique-id-in-javascript-1b13#comment-1ol48
export const getUID = () => String(
	Date.now().toString(32) + Math.random().toString(16)
	).replace(/\./g, '')


export const trace = string => object => {
	console.log(string, object)
	return object
}

export const getNextWeekdayFromDate = (date, weekday, options) => {
	const currentWeekday = date.getDay(); // 0 (Sun) - 6 (sat)
	let daysToAdvance = (weekday - currentWeekday)

	if (daysToAdvance <= 0) {
		daysToAdvance = daysToAdvance + 7
	}

	const newDate = new Date()
	newDate.setUTCDate(date.getUTCDate() + daysToAdvance + (options.additionalWeek ? 7 : 0))

	return newDate;
}

export const getNextWeekdaysFromToday = (options) => Object.keys(WEEKDAYS).map(weekday => getNextWeekdayFromDate(new Date(), WEEKDAYS[weekday], options))

export const datesSameWeek = (d1, d2) => getWeekNumber(d1) === getWeekNumber(d2)

// Source https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
const getWeekNumber = date => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

export default {
	byDate,
	getUID,
	trace,
	getNextWeekdayFromDate,
	getNextWeekdaysFromToday,
}