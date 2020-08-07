const AbstractMessage = require('./AbstractMessage.js');

class Poll extends AbstractMessage {
	constructor(params) {
		super(params);

		this._events = [
			['click', 'pa_'+this.domId, 'onAnswerClick'],
			['click', 'pols_'+this.domId, 'onSolutionClick'],
			['click', 'polv_'+this.domId, 'onVotersClick'],
			['click', 'pbt_'+this.domId, 'onButtonClick'],
		];

		this._data.poll = this._data.message._poll;
		this._data.answers = this._data.message._poll._answers;
		this._setVoters = [];

		this._picked = {};
		this._animated = {};
	}

	afterRender() {
		console.error('aster render');
		this.nextTick(()=>{
			this.assignDomEvents();
			this.updateDOM();
		});
	}

	onVotersClick() {
		if ((this._data.poll.isVoted || this._data.poll.isClosed) && this._data.poll.isPublic) {
			app._interface._components.RightSidebar.showBlock('Poll', {
				poll: this._data.poll,
			});
			app._interface._components.RightSidebar.show();
		}
	}

	updateContent() {
		this.updateDOM();
	}

	async updateVoters() {
		this.$('.pollMeta').classList[(this._data.poll._solution ? 'remove' : 'add')]('nosolution');

		if (this._setVoters.length >= 3) return;
		let users = this._data.poll.getRecentVoters();
		const cont = this.$('.pollVoters');
		let html = '';
		for (let user of users) {
			if (this._setVoters.indexOf(user._id) == -1) {
				html += this.avHTML(user, 'avatarSmall');
				this._setVoters.push(user._id);
				console.error(this._setVoters);
			}
		}

		if (html) {
			cont.insertAdjacentHTML('beforeend', html);
		}
	}

	async updateClosing() {
		const contt = this.$('.pollMetaTime');
		const contp = this.$('.progress');
		const contm = this.$('.pollMeta');

		let was = false;

		while(this._data.poll.isClosing) {
			was = true;
			contm.classList.add('closing');

			let closing = this._data.poll.closingIn;
			// closing = {time: '5:30', percents: 10};

			if (closing.time) {
				contt.innerHTML = closing.time;
			}
			if (closing.percents) {
				console.error(closing.percents);
				contp.className = 'progress '+('progress'+(100 - (Math.floor(closing.percents / 10) + 1) * 10));

				if (closing.percents < 30) {
					contm.classList.add('closingred');
				}

			}

			if (this._data.poll.isClosing) {
				await new Promise((res)=>setTimeout(res, 1000));
			}
		}

		contm.className = 'pollMeta';

		if (was) {
			this._data.poll.fetch()
				.then(()=>{
					console.error(this._data.poll);
					if (this._data.poll._solution) {
						this._parent.showNotice(this._data.poll._solution, 'lamp');
					}
					this.updateVoters();
				});
		}
		// contt.innerHTML = '';
	}

	onSolutionClick() {
		if (this._data.poll._solution) {
			this._parent.showNotice(this._data.poll._solution, 'lamp');
		}
	}

	updateDOM() {
		if (this._data.poll.isVoted || this._data.poll.isClosed) {
			this.$('.pollAnswers').classList.add('voted');

			const createPercentAnimator = async (cont, toValue, isValid) => {
				let initialValue = 0;
				do {
					if (initialValue < toValue) {
						initialValue++;
					}

					cont.innerHTML = ''+initialValue+'%';
					await new Promise((res)=>{ setTimeout(res, 3); });
				} while(initialValue < toValue);
			};

			const isQuiz = this._data.poll.isQuiz;

			for (let answer of this._data.answers) {
				let domId = '#pa_'+this.domId+'_'+answer.uniq;
				// let styleML = '' + answer.percents + 'px';

				const ac = this.$(domId);
				if (ac) {
					ac.querySelector('.pabFlow2').style.marginLeft = '' + answer.percents + '%';

					const asc = ac.querySelector('.pollAnswerSelected');
					if (answer.chosen || answer.correct) {
						setTimeout(()=>{
							asc.classList.add('chosen');
						}, 200);
						asc.innerHTML = AbstractMessage.AppUI.getIconHTML('check');
					}
					if (isQuiz && answer.chosen && !answer.correct) {
						ac.classList.add('pollAnswerWrong');
						asc.innerHTML = AbstractMessage.AppUI.getIconHTML('close');
					}

					if (!this._animated[domId]) {
						this._animated[domId] = true;
						createPercentAnimator(ac.querySelector('.pollAnswerResult'), answer.percents);
					}
				}
			}

			const totalVoters = this._data.poll._totalVoters;
			// this.$('.pollTotalVoters').innerHTML = totalVoters + ' voter'+(totalVoters != 1 ? 's' : '');

			// this.$('.pollVoteButton').style.display = 'block';

			if (this._data.poll.isPublic) {
				this.$('.pollVoteButton').classList.remove('inactive');
				this.$('.pollVoteButton').innerHTML = 'View Results';
			} else {
				this.$('.pollVoteButton').innerHTML = totalVoters + ' voter'+(totalVoters != 1 ? 's' : '');
				this.$('.pollVoteButton').classList.add('inactive');
				// this.$('.pollVoteButton').style.display = 'none';
			}

		} else {
			// ready to vote
			if (this._data.poll.isMultiple) {
				this.$('.pollVoteButton').classList.remove('inactive');
				this.$('.pollVoteButton').innerHTML = 'Vote';
				// this.$('.pollVoteButton').style.display = 'block';
			} else {
				this.$('.pollVoteButton').classList.add('inactive');
			}
		}


		this.updateClosing();
		this.updateVoters();
	}

	doVote() {
		if (this._data.poll.isVoted || this._data.poll.isClosed) {
			return;
		}

		let a = [];
		for (let k in this._picked) a.push(this._picked[k]);
		if (!a.length) return;

		this.$$('.pollAnswer').forEach((el)=>{
			el.classList.remove('pickedAnswer');
			if (this._picked[el.dataset.uniq]) {
				el.classList.add('selectedAnswer');
			}
		});

		this._data.poll.vote(a)
			.then(()=>{
				this.updateDOM();
			});
	}

	onButtonClick() {
		if (this._data.poll.isPublic && (this._data.poll.isVoted || this._data.poll.isClosed)) {
			this.onVotersClick();
		} else {
			this.doVote();
		}
	}

	onAnswerClick(e) {
		// const base = this.$();
		const closest = event.target.closest('.pollAnswer');
		let uniq = closest.dataset.uniq;
		// if (closest && base.contains(closest)) {
			// const uniq = closest.dataset.uniq;
		let answer = null;
		for (let a of this._data.answers) {
			if (a.uniq == uniq) {
				answer = a;
			}
		}

		if (!answer) {
			return;
		}

		if (this._data.poll.isMultiple) {
			if (!this._picked[answer.uniq]) {
				closest.classList.add('pickedAnswer');
				this._picked[answer.uniq] = answer;
			} else {
				closest.classList.remove('pickedAnswer');
				delete this._picked[answer.uniq];
			}
		} else {
			this._picked[answer.uniq] = answer;
			this.doVote();

			closest.classList.add('selectedAnswer');
				this.updateDOM();
			// closest.querySelector('.pollAnswerButton').classList.remove('rpb');
			// const ripple = closest.querySelector('.ripple');
			// if (ripple) {
			// 	ripple.parentNode.removeChild(ripple);
			// }

			// this._data.poll.vote([answer])
			// 	.then(()=>{
			// 		this.updateDOM();
			// 	});
		}

	}
	// }
};
//
Poll.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
					{{if (options.sameAsNext)}} sameAsNext{{/if}} panelMessagePoll
				"
				title="{{message._id}}"
				style="
				"
				>

				<div class="messageAuthor">{{authorName}}</div>
				{{if (options.reply)}}
					<div class="messageReply">
						<div class="author">{{reply.author}}</div>
						<div class="replyBody">{{reply.message}}</div>
					</div>
				{{/if}}



				{{if (options.forwardedInfo)}}<div class="fowardedHeader">Forwarded message</div>{{/if}}
				<div class="messageContent"
					style=""
					>
					{{if (options.forwardedInfo)}}
						<div class="author">{{forwardedInfo.name}}</div>
					{{/if}}

					<div class="messagePoll">
						<div class="pollTitle">{{poll.question}}</div>
						<div class="pollMeta">
							<div class="pollMetaSolution" id="pols_{{domId}}" >{{self.AppUI.getIconHTML('lamp')|safe}}</div>
							<div class="pollMetaTimer">
								<span class="pollMetaTime">0:05</span>
								<div class="pollMetaProgress"><div class="progress active progress50"></div></div>
							</div>
						</div>
						<div class="pollNote">{{if (!options.poll.isPublic)}}Anonymous {{/if}}{{if (options.poll.isQuiz)}}Quiz{{#else}}Poll{{/if}}
							<div class="pollVoters" id="polv_{{domId}}"></div>
						</div>

						<div class="pollAnswers {{if (options.poll.isVoted)}}voted{{/if}}" id="pa_{{domId}}">
							{{each(options.answers)}}
							<div class="pollAnswer" id="pa_{{domId}}_{{@this.uniq}}" data-uniq="{{@this.uniq}}">
								<div class="pollAnswerLeft">
									<div class="pollAnswerButton rpb"><div class="pabCircle">{{self.AppUI.getIconHTML('check')|safe}}</div></div>
									<div class="pollAnswerResult">{{@this.percents}}%</div>
									<div class="pollAnswerSelected"></div>
								</div>
								<div class="pollAnswerText">{{@this.text}}</div>
								<div class="pollAnswerBarCont"><div class="pabFlow1"></div><div class="pabFlow2" {{if (options.poll.isVoted)}}style="margin-left: {{@this.percents}}%"{{/if}}></div><div class="pollAnswerBar"></div></div>
							</div>
							{{/each}}
						</div>

						<div class="pollVoteButton" id="pbt_{{domId}}">No answers</div>
					</div>

					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				</div>
				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

			</div>

			<div style="clear: both"></div>
		`;


module.exports = Poll;