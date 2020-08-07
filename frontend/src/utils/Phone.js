const countries = require('./countries.js');

module.exports = {

	strip(value) {
		value = ''+value;
		if (value.indexOf('+') !== 0) {
			value = '+'+value;
		}
		value = value.replace(/[^\d+]/g,'').substring(0,15); // ? 10 ? Longest is in Austria

		return value;		
	},

	getCountryByNumber(value) {
		let foundCountry = null;
		let foundMaxLength = 0;
		let foundDialCode = null;
		for (let country of countries) {
			let dialCode = country.dialCode.split(' ').join('');
			if (value.indexOf(dialCode) === 0) {
				let startsWithOk = null;
				if (country.canStartWith) {
					let lat = value.split(dialCode).join('');
					startsWithOk = false;
					for (let sw of country.canStartWith) {
						if (lat.indexOf(''+sw) === 0) {
							startsWithOk = true;
						}
					}
				}
				if ((startsWithOk === null && dialCode.length > foundMaxLength) || (startsWithOk === true && dialCode.length >= foundMaxLength)) {
					foundCountry = country;
					foundMaxLength = dialCode.length;
					foundDialCode = dialCode;
				}
			}
		}

		return foundCountry;
	},

	formatNumber(country, value) {
		let countryCode = (country ? country.dialCode : null) || null;

		let formatted = value;
		let raw = value;
		if (countryCode) {
			countryCode = countryCode.split(' ').join('');
			formatted = '';
			let rule = null;
			value = value.split(countryCode).join('');

			rule = (country ? country.rule : [3,2,2,2,2]);
			rule.push(2); // push 2 extra digits in case we have something wrong in our rules @todo: make sure all is good and remove this

			for (let i = 0, si = 0, sl = 0; i < value.length; i++) {
				if (!rule || si < rule.length) {
					formatted+=value.charAt(i);		
				}
				sl++;
				if (rule && sl == rule[si]) {
					si++; 
					if (si < rule.length) {
						formatted+=' ';
					}
					sl = 0;	
				}
			}

			formatted = countryCode+' '+formatted.trim();
		}

		return {
			raw: raw,
			formatted: formatted
		};
	}
};