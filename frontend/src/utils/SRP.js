
class SRP {
	constructor(algo, accountPassword) {
		this._algo = algo;
		this._password = '';

		this._salt1 = algo.salt1;
		this._salt2 = algo.salt2;
		this._g = algo.g;
		this._p = algo.p;

		this._srp_B = accountPassword.srp_B;
		this._srp_id = accountPassword.srp_id;
		this._secure_random = accountPassword.secure_random;
	}

	setPassword(str) {
		this._password = str;
	}

	stringToBytes(str) {
		return new TextEncoder().encode(str);
	}

	H(data) {
		return new Uint8Array(window.crypto.subtle.digest('SHA-256', data));
	}
	function SH(data, salt) {
		return H(concat(salt, data, salt));
	}
	function PH1(password, salt1, salt2) {
		return SH(SH(password, salt1), salt2);
	}
	function PH2(password, salt1, salt2) {
		return SH(pbkdf2(PH1(password, salt1, salt2), salt1, 100000), salt2);
	}
	function pbkdf2(password, salt, iterations, len, hashType) {
		var enc = new TextEncoder();
		var key = window.crypto.subtle.importKey(
			'raw', enc.encode(password), {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey']);

	}
}

module.exports = SRP;