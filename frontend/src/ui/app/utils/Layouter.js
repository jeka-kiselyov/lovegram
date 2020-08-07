class Layouter {
	constructor(items, options = {}) {
		this._minWidth = 50; // st::historyGroupWidthMin / 2 = 100 / 2;
		if (options.hasText) {
			this._minWidth = 100; // should be wider if there's text under
		}

		this._proportions = '';
		this._averageRatio = 1;
		this._hasHugeRatio = false;
		this._count = 0;

		this._maxWidth = options.maxWidth || 308; // 308  // st::sendMediaPreviewSize
		this._maxHeight = this._maxWidth * 4 / 3;  // it's not really MAX, may be higher, based on TG's apps algo
		this._maxSizeRatio = this._maxWidth / this._maxHeight;

		this._spacing = 2; // st::historyGroupSkip / 2 = 4/2

		this._items = items;
		this._ratios = [];

		this._bottomRightItem = null;
		this._bottomLeftItem = null;

		this._width = 0;  // calculated based on items
		this._height = 0;

		this.countRatios();
	}

// std::vector<float64> Layouter::CountRatios(const std::vector<QSize> &sizes) {
// std::string Layouter::CountProportions(const std::vector<float64> &ratios) {
	countRatios() {
		this._proportions = '';
		this._hasHugeRatio = false;
		this._ratios = [];

		let allRatios = 0;
		for (let item of this._items) {
			item.ratio = item.width / item.height;
			item.proportion = (item.ratio > 1.2) ? 'w' : (item.ratio < 0.8) ? 'n' : 'q';

			this._proportions+=item.proportion;

			allRatios+=item.ratio;
			if (item.ratio > 2) {
				this._hasHugeRatio = true;
			}

			this._ratios.push(item.ratio);
		}

		this._count = this._items.length;
		this._averageRatio = allRatios / this._count;
	}

	layout() {
		let poss = [];
		if (this._count == 1) {
			let width = this._maxWidth;
			let height = this._maxHeight;
			if (this._items[0].ratio > 1) {
				height = this._maxWidth / this._items[0].ratio;
			} else {
				width = this._maxHeight * this._items[0].ratio;
			}

			width = (width < this._minWidth) ? this._minWidth : ((width > this._maxWidth) ? this._maxWidth : width);
			height = (height < this._minWidth) ? this._minWidth : ((height > this._maxHeight) ? this._maxHeight : height);

			poss = [
				[0,0,width,height],
			];
		} else if (this._count >= 5 || this._hasHugeRatio) {
			let cl = new ComplexLayouter(this._ratios, this._averageRatio, this._maxWidth, this._maxHeight, this._minWidth, this._spacing);
			//ratios, averageRatio, maxWidth, maxHeight, minWidth, spacing)
			poss = cl.layout();
		} else if (this._count == 2) {
			poss = this.layoutTwo();
		} else if (this._count == 3) {
			poss = this.layoutThree();
		} else if (this._count == 4) {
			poss = this.layoutFour();
		}

		if (poss.length == this._items.length) {
			for (let i = 0; i < this._items.length; i++) {
				this._items[i].pos = {
					left: poss[i][0],
					top: poss[i][1],
					width: poss[i][2],
					height: poss[i][3],
				};
				this._items[i].style = 'left: '+poss[i][0]+'px; top: '+poss[i][1]+'px; width: '+poss[i][2]+'px; height: '+poss[i][3]+'px';

				if (this._width < poss[i][0] + poss[i][2]) {
					this._width = Math.floor(poss[i][0] + poss[i][2]);
				}
				if (this._height < poss[i][1] + poss[i][3]) {
					this._height = Math.floor(poss[i][1] + poss[i][3]);
				}
				if (!this._bottomLeftItem || (this._bottomLeftItem.pos.left > poss[i][0] || this._bottomLeftItem.pos.top < poss[i][1])) {
					this._bottomLeftItem = this._items[i];
				}
				if (!this._bottomRightItem || (this._bottomRightItem.pos.left < poss[i][0] || this._bottomRightItem.pos.top < poss[i][1])) {
					this._bottomRightItem = this._items[i];
				}
			}
		} else {
			alert('wrong');
		}

		return this._items;
	}

	layoutTwo() {
	// Expects(_count == 2);
		if (this._proportions == 'ww' && this._averageRatio > 1.4*this._maxSizeRatio && this._items[1].ratio - this._items[0].ratio < 0.2) {
			return this.layoutTwoTopBottom();
		} else if (this._proportions == 'ww' || this._proportions == 'qq') {
			return this.layoutTwoLeftRightEqual();
		}
		return this.layoutTwoLeftRight();
	}

	layoutThree() {
		if (this._items[0].proportion == 'n') {
			return this.layoutThreeLeftAndOther();
		}
		return this.layoutThreeTopAndOther();
	}

	layoutFour() {
		if (this._items[0].proportion == 'w') {
			return this.layoutFourTopAndOther();
		}
		return this.layoutFourLeftAndOther();
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L337
	layoutFourTopAndOther() {
		const w = this._maxWidth;
		const h0 = Math.round(Math.min(
				w / this._items[0].ratio,
				(this._maxHeight - this._spacing) * 0.66
			));
		const h = Math.round(
				(this._maxWidth - 2 * this._spacing) /
					(this._items[1].ratio + this._items[2].ratio + this._items[3].ratio)
			);
		const w0 = Math.max(
				this._minWidth,
				Math.round(Math.min(
						(this._maxWidth - 2 * this._spacing) * 0.4,
						h * this._items[1].ratio
					))
			);
		const w2 = Math.round(Math.max(
				Math.max(
						this._minWidth * 1,
						(this._maxWidth - 2 * this._spacing) * 0.33
					),
				h*this._items[3].ratio
			));
		const w1 = w - w0 - w2 - 2*this._spacing;
		const h1 = Math.min(
				this._maxHeight - h0 - this._spacing,
				h
			);

		return [
			[0, 0, w, h0],
			[0, h0 + this._spacing, w0, h1],
			[w0 + this._spacing, h0 + this._spacing, w1, h1],
			[w0 + this._spacing + w1 + this._spacing, h0 + this._spacing, w2, h1],
		];
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L382
	layoutFourLeftAndOther() {
		const h = this._maxHeight;
		const w0 = Math.round(Math.min(
				h * this._items[0].ratio,
				(this._maxWidth - this._spacing) * 0.6
			));
		const w = Math.round(
				(this._maxHeight - 2 * this._spacing) /
					(1 / this._items[1].ratio + 1 / this._items[2].ratio + 1 / this._items[3].ratio)
			);
		const h0 = Math.round(w / this._items[1].ratio);
		const h1 = Math.round(w / this._items[2].ratio);
		const h2 = h - h0 - h1 - 2 * this._spacing;
		const w1 = Math.max(
				this._minWidth,
				Math.min(this._maxWidth - w0 - this._spacing, w)
			);

		return [
			[0, 0, w0, h],
			[w0 + this._spacing, 0, w1, h0],
			[w0 + this._spacing, h0 + this._spacing, w1, h1],
			[w0 + this._spacing, h0 + h1 + 2 * this._spacing, w1, h2],
		];
	}

	//https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L268
	layoutThreeLeftAndOther() {
		const firstHeight = this._maxHeight;
		const thirdHeight = Math.round(Math.min(
				(this._maxHeight - this._spacing) / 2,
				(this._items[1].ratio * (this._maxWidth - this._spacing)
					/ (this._items[2].ratio + this._items[1].ratio))
			));
		const secondHeight = firstHeight - thirdHeight - this._spacing;
		const rightWidth = Math.max(
				this._minWidth,
				Math.round(Math.min(
						(this._maxWidth - this._spacing) / 2,
						Math.min(
								thirdHeight * this._items[2].ratio,
								secondHeight * this._items[1].ratio
							)
					))
			);
		const leftWidth = Math.min(
				Math.round(firstHeight * this._items[0].ratio),
				this._maxWidth - this._spacing - rightWidth
			);

		return [
			[0, 0, leftWidth, firstHeight],
			[leftWidth + this._spacing, 0, rightWidth, secondHeight],
			[leftWidth + this._spacing, secondHeight + this._spacing, rightWidth, thirdHeight],
		];
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L306
	layoutThreeTopAndOther() {
		const firstWidth = this._maxWidth;
		const firstHeight = Math.round(Math.min(
				firstWidth / this._items[0].ratio,
				(this._maxHeight - this._spacing) * 0.66
			));
		const secondWidth = (this._maxWidth - this._spacing) / 2;
		const secondHeight = Math.min(
				this._maxHeight - firstHeight - this._spacing,
				Math.round(Math.min(
						secondWidth / this._items[1].ratio,
						secondWidth / this._items[2].ratio
					))
			);
		const thirdWidth = firstWidth - secondWidth - this._spacing;

		return [
			[0, 0, firstWidth, firstHeight],
			[0, firstHeight + this._spacing, secondWidth, secondHeight],
			[secondWidth + this._spacing, firstHeight + this._spacing, thirdWidth, secondHeight],
		];
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L195
	layoutTwoTopBottom() {
		const width = this._maxWidth;
		const height = Math.round(
			Math.min(
					width / this._items[0].ratio,
					Math.min(
						width / this._items[1].ratio,
						(this._maxHeight - this._spacing) / 2
					)
				)
			);

		return [
			[0, 0, width, height],
			[0, height + this._spacing, width, height],
		];
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L217
	layoutTwoLeftRightEqual() {
		const width = (this._maxWidth - this._spacing) / 2;
		const height = Math.round(
				Math.min(
						width / this._items[0].ratio,
						Math.min(
								width / this._items[1].ratio,
								this._maxHeight * 1
							)
					)
			);

		return [
			[0, 0, width, height],
			[width + this._spacing, 0, width, height],
		];
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L237
	layoutTwoLeftRight() {
		const minimalWidth = Math.round(this._minWidth*1.5);
		const secondWidth = Math.min(
				Math.round(Math.max(
						0.4 * (this._maxWidth - this._spacing),
						(this._maxWidth - this._spacing) / this._items[0].ratio
							/ (1 / this._items[0].ratio + 1 / this._items[1].ratio)
					)),
				this._maxWidth - this._spacing - minimalWidth
			);
		const firstWidth = this._maxWidth - secondWidth - this._spacing;
		const height = Math.min(
				this._maxHeight,
				Math.round(Math.min(
						firstWidth / this._items[0].ratio,
						secondWidth / this._items[1].ratio
					))
			);

		return [
			[0, 0, firstWidth, height],
			[firstWidth + this._spacing, 0, secondWidth, height],
		];
	}
};

class ComplexLayouter {
	constructor(ratios, averageRatio, maxWidth, maxHeight, minWidth, spacing) {
		this._ratios = this.cropRatios(ratios, averageRatio);
		this._averageRatio = averageRatio;
		this._maxWidth = maxWidth;
		this._maxHeight = maxHeight;
		this._minWidth = minWidth;
		this._spacing = spacing;

		this._count = this._ratios.length;
	}

	snap(v, _min, _max) {
		return (v < _min) ? _min : ((v > _max) ? _max : v);
	}

	cropRatios(ratios, averageRatio) {
		let ret = [];
		const kMaxRatio = 2.75;
		const kMinRatio = 0.6667;

		for (let r of ratios) {
			ret.push(averageRatio > 1.1 ? this.snap(r, 1, kMaxRatio) : this.snap(r, kMinRatio, 1));
		}
		return ret;
	}

	// https://github.com/telegramdesktop/tdesktop/blob/4669c07dc5335cbf4795bbbe5b0ab7c007b9aee2/Telegram/SourceFiles/ui/grouped_layout.cpp#L452
	layout() {
		const attempts = [];

		const multiHeight = (offset, count)=>{
			const ratios = this._ratios.slice(offset, offset + count);
			const sum = ratios.reduce((a, b) => a + b, 0);

			return (this._maxWidth - (count - 1) * this._spacing) / sum;
		};

		const pushAttempt = (lineCounts)=>{
			let heights = [];
			let offset = 0;

			for (let count of lineCounts) {
				heights.push(multiHeight(offset, count));
				offset += count;
			}

			attempts.push([lineCounts, heights]);
		};

		for (let first = 1; first != this._count; ++first) {
			const second = this._count - first;
			if (first > 3 || second > 3) {
				continue;
			}
			pushAttempt([first, second]);
		}
		for (let first = 1; first != this._count - 1; ++first) {
			for (let second = 1; second != this._count - first; ++second) {
				const third = this._count - first - second;
				if ((first > 3)
					|| (second > ((this._averageRatio < 0.85) ? 4 : 3))
					|| (third > 3)) {
					continue;
				}
				pushAttempt([first, second, third]);
			}
		}
		for (let first = 1; first != this._count - 1; ++first) {
			for (let second = 1; second != this._count - first; ++second) {
				for (let third = 1; third != this._count - first - second; ++third) {
					const fourth = this._count - first - second - third;
					if (first > 3 || second > 3 || third > 3 || fourth > 3) {
						continue;
					}
					pushAttempt([first, second, third, fourth]);
				}
			}
		}


		let optimalAttempt = null;
		let optimalDiff = 0;

		const getBad2 = (counts, lineCount)=>{
			for (let line = 1; line != lineCount; ++line) {
				if (counts[line - 1] > counts[line]) {
					return 1.5;
				}
			}
			return 1;
		};

		for (let attempt of attempts) {
			const heights = attempt[1];
			const counts = attempt[0];
			const lineCount = counts.length;
			const totalHeight = heights.reduce((a, b) => a + b, 0) + this._spacing * (lineCount - 1);
			const minLineHeight = Math.min(heights);
			const maxLineHeight = Math.max(heights);

			const bad1 = (minLineHeight < this._minWidth) ? 1.5 : 1;
			const bad2 = getBad2(counts, lineCount);
			const diff = Math.abs(totalHeight - this._maxHeight) * bad1 * bad2;
			if (!optimalAttempt || diff < optimalDiff) {
				optimalAttempt = attempt;
				optimalDiff = diff;
			}
		}


		const optimalCounts = optimalAttempt[0];
		const optimalHeights = optimalAttempt[1];
		const rowCount = optimalCounts.length;

		let index = 0;
		let y = 0;
		let ret = [];

		for (let row = 0; row != rowCount; ++row) {
			const colCount = optimalCounts[row];
			const lineHeight = optimalHeights[row];
			const height = Math.round(lineHeight);

			let x = 0;
			for (let col = 0; col != colCount; ++col) {
				const ratio = this._ratios[index];
				const width = (col == colCount -1) ? (this._maxWidth - x) : Math.round(ratio * lineHeight);

				//
				//
				ret.push([x,y,width,height]);

				x+= (width + this._spacing);
				++index;
			}
			y+= height + this._spacing;
		}

		return ret;
	}
}

module.exports = Layouter;