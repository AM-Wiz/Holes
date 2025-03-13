import assert from "node:assert";

export class SmoothFrameCounter
{
    /** @type {Number[]} */
    deltaSamples_ = [];
    curSampleIdx_ = 0;

    /** @type {Number} */
    maxSamples_ = 10;

    /** @type {Number} */
    deltaTime_ = 0;
    /** @type {Number} */
    fps_ = 0;


    get deltaTime() { return this.deltaTime_; }
    get fps() { return this.fps_; }


    #updateDelta() {
        this.deltaTime_ = 0;
        if (this.deltaSamples_.length > 0) {
            this.deltaTime_ = 0;
            for (let idx = 0; idx < this.deltaSamples_.length; idx++) {
                this.deltaTime_ += this.deltaSamples_[idx];
            }
    
            this.deltaTime_ /= this.deltaSamples_.length;
        }

        if (this.deltaTime_ <= 0)
            this.fps_ = 0;
        else
            this.fps_ = 1 / this.deltaTime_;
    }

    add(deltaTime) {
        if (this.deltaSamples_.length < this.maxSamples_) {
            this.deltaSamples_.push(deltaTime);
        } else {
            const idx = this.curSampleIdx_;
            this.curSampleIdx_ = Math.trunc((this.curSampleIdx_ + 1) % this.deltaSamples_.length);

            this.deltaSamples_[idx] = deltaTime;
        }

        this.#updateDelta();
    }
};