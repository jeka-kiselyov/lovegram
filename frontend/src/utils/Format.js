class Format {
	static dateToHuman(timestamp, short) {
	    let date = new Date(timestamp*1000);
	    return ''+Format.monthsNames[date.getMonth()]+(!short ? '&nbsp;' : ' ')+date.getDate()+(!short ? (',&nbsp;'+date.getFullYear()+' at '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)) : '');
	}

	static numberToString(number) {
		return (''+number).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
	}

	static numberToDecims(number) {
		if (number < 2000) {
			return Format.numberToString(number);
		}

	    const i = Math.floor( Math.log(number) / Math.log(1000) );
	    return ( number / Math.pow(1000, i) ).toFixed(1) + ['', 'K', 'M', 'B'][i];
	}

	/**
	 * Stupid algo to guess word form based on text where that word occured
	 * @param  {[type]} text   [description]
	 * @param  {[type]} search [description]
	 * @return {[type]}        [description]
	 */
	static guessWord(text, search) {
		const lsearch = search.trim().toLowerCase();
		const words = (''+text).trim().toLowerCase().split(' ');

		// console.log(words);

		const scores = {};

		const doscores = (offset)=>{
			let s = lsearch.substring((offset < 0 ? 0 : offset), (lsearch.length - (offset < 0 ? Math.abs(offset) : 0)));
			for (let word of words) {
				if (word.indexOf(s) != -1) {
					if (!scores[word]) {
						scores[word] = (4 - Math.abs(offset)) - (Math.abs(s.length - word.length))*0.5;
					}
				}
			}

			// console.log('find by offset', offset, s);
		};
		const offsets = [-1,-2,-3,-4,-5,1,2,3];
		for (let offset of offsets) {
			doscores(offset);
		}
		const sorted = Object.keys(scores).sort(function(a,b){return scores[b]-scores[a]});
		if (sorted.length) {
			return sorted[0];
		}
	}
}

Format.monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

module.exports = Format;