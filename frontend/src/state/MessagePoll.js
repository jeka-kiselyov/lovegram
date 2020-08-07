
class MessagePoll {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api

		this._messageApiObject = params.messageApiObject || {};

		this._peer = params.peer;

		this._id = this._apiObject.id;

		this._answers = [];
		this._results = [];
		this._totalVoters = 0;
		this._solution = '';

		this._isVoted = false;

		this.fillUpdatesFromAPIResult(this._apiObject);
		this.fillUpdatesFromAPIResult(this._messageApiObject);
		this.mergeResults();

		this._at = (new Date()).getTime() / 1000;

		this._votesList = {};
		this._votesListIds = {};
		this._votesListOffsets = {};
	}

	async getPollVotes(answer) {
		if (!this._votesList[answer.uniq]) {
			this._votesList[answer.uniq] = [];
			this._votesListIds[answer.uniq] = {};
		}

		let offset = this._votesListOffsets[answer.uniq] || '';
		if (offset == Infinity) return;
		// if (offset) offset = offset+1;
		// console.error('getting poll', answer.option);
		let limit = 3+this._votesList[answer.uniq].length;
		//offset = offset
		const resp = await this._peerManager._user.invoke('messages.getPollVotes', { flags: 1, limit: limit, offset: '', option: answer.option, peer: this._peer.getInputPeerObject(), id: this._messageApiObject.id});
		// console.error(resp);

		if (resp && resp.data) {
			if (resp.data.users) {
				for (let au of resp.data.users) {
					this._peerManager.peerUserByAPIResult(au);
				}
			}
			if (resp.data.votes) {
				for (let av of resp.data.votes) {
					if (!this._votesListIds[answer.uniq][av.user_id]) {
						this._votesList[answer.uniq].push(this._peerManager._peerUsers[av.user_id]);
						this._votesListIds[answer.uniq][av.user_id] = true;
					}
				}
			}

			if (resp.data.next_offset) {
				this._votesListOffsets[answer.uniq] = resp.data.next_offset;
			} else {
				this._votesListOffsets[answer.uniq] = Infinity;
			}
		}

	}

	getRecentVoters() {
		const ret = [];
		if (this._apiObject.recent_voters) {
			for (let uid of this._apiObject.recent_voters) {
				if (this._peerManager._peerUsers[uid]) {
					ret.push(this._peerManager._peerUsers[uid]);
				}
			}
		}
		return ret;
	}

	get isVoted() {
		return this._isVoted;
	}

	get closingIn() {
		const ret = {};
		if (this.isClosing) {
			let ct = ((new Date()).getTime() / 1000); // current time
			let st = (this._apiObject.close_date && this._apiObject.close_period) ? (this._apiObject.close_date - this._apiObject.close_period) : this._at;
			let ot = (this._apiObject.close_date ? this._apiObject.close_date : (st+this._apiObject.close_period));

			ret.time = ''+Math.floor((ot - ct) / 60) + ':' + ('0' + (Math.floor((ot - ct)) % 60)).slice(-2);
			ret.percents = Math.floor(((ot - ct) / (ot - st))*100);
		}
		return ret;
	}

	get isClosing() {
		return (!this.isClosed && !this.isVoted && (this._apiObject.close_date || this._apiObject.close_period));
	}

	get isClosed() {
		if (this._apiObject.pFlags) {
			if (this._apiObject.pFlags.closed) return true;
		}
		let ct = ((new Date()).getTime() / 1000);
		// console.error('ct', ct);
		// console.error('close_date', this._apiObject.close_date);
		// console.error('at', this.at);
		// console.error('at', this.at);

		if ((this._apiObject.close_date && this._apiObject.close_date <= ct) || (this._apiObject.close_period && (this._apiObject.close_period + this._at) <= ct)) {
			return true;
		}
		return false;
	}

	get isPublic() {
		return (this._apiObject.pFlags && this._apiObject.pFlags.public_voters);
	}

	get isMultiple() {
		return (this._apiObject.pFlags && this._apiObject.pFlags.multiple_choice);
	}

	get isQuiz() {
		return (this._apiObject.pFlags && this._apiObject.pFlags.quiz);
	}

	get question() {
		return this._apiObject.question;
	}

	async fetch() {
		const resp = await this._peerManager._user.invoke('messages.getPollResults', {peer: this._peer.getInputPeerObject(), msg_id: this._messageApiObject.id});
		if (resp.data && resp.data.updates) {
			for (let update of resp.data.updates) {
				this.processApiUpdate(update);
			}
		}
	}

	processApiUpdate(updateObject) {
		this.fillUpdatesFromAPIResult(updateObject);
	}

	async vote(anwerOptions) {
		const params = {
			peer: this._peer.getInputPeerObject(),
			msg_id: this._messageApiObject.id,
			options: [],
		};

		for (let answer of anwerOptions) {
			if (answer.option) {
				params.options.push(answer.option);
			} else {
				params.options.push(answer);
			}
		}

		const resp = await this._peerManager._user.invoke('messages.sendVote', params);
		if (resp.data && resp.data.updates) {
			for (let update of resp.data.updates) {
				this.processApiUpdate(update);
			}

			return true;
		}

		return false;
	}

	fillUpdatesFromAPIResult(apiObject) {
		// console.error(apiObject);

		if (!apiObject) {
			return false;
		}

		if (apiObject.answers) {
			this._answers = apiObject.answers;
			for (let answer of this._answers) {
				answer.uniq = answer.option.join('');
			}
		}
		if (apiObject.close_date) {
			this._apiObject.close_date = apiObject.close_date;
		}
		if (apiObject.close_period) {
			this._apiObject.close_period = apiObject.close_period;
		}
		if (apiObject.results) {
			// console.error('results');

			if (apiObject.results.total_voters) {
				this._totalVoters = apiObject.results.total_voters;
			}
			if (apiObject.results.results) {
				this._results = apiObject.results.results;
			}
			if (apiObject.results.solution) {
				this._solution = apiObject.results.solution;
			}
			if (apiObject.results.recent_voters) {
				this._apiObject.recent_voters = apiObject.results.recent_voters;
			}
		}
		if (apiObject.media) {
			this.fillUpdatesFromAPIResult(apiObject.media);
		}

		this.mergeResults();

		this._peer.emit('updateMessage', {id: this._messageApiObject.id});
	}

	mergeResults() {
		// console.error('mergeResults');

		if (this._answers && this._results && this._answers.length == this._results.length) {
			for (let i = 0; i < this._answers.length; i++) {
				// @todo: is order enough to match? There's `option` byte array to compare if not
				this._answers[i].voters = this._results[i].voters;
				this._answers[i].percents = Math.floor((this._results[i].voters / this._totalVoters) * 100);

				if (this._results[i].pFlags) {
					if (this._results[i].pFlags.chosen) {
						this._isVoted = true;
						this._answers[i].chosen = true;
					}
					if (this._results[i].pFlags.correct) {
						this._answers[i].correct = true;
					}
				}
			}

			// console.error(this._answers);
		}
	}
}

module.exports = MessagePoll;