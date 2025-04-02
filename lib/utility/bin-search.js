

/**
 * 
 * @template TKey
 * @param {ArrayLike<TKey>} list 
 * @param {TKey} target 
 * @param {?Number} start 
 * @param {?Number} end 
 */
export const binarySearchLow = (list, target, start, end) => {
    start ??= 0;
    end ??= target.length;

    while (start <= end) {
        const mid = Math.trunc((start + end) / 2);

        if (list[mid] < target) {
            start = mid + 1;
        } else {
            end = mid;
        }
    }

    return start;
}

/**
 * 
 * @template TKey
 * @param {ArrayLike<TKey>} list 
 * @param {TKey} target 
 * @param {?Number} start 
 * @param {?Number} end 
 */
export const binarySearchHigh = (list, target, start, end) => {
    start ??= 0;
    end ??= target.length;

    while (start <= end) {
        const mid = Math.trunc((start + end) / 2);

        if (list[mid] <= target) {
            start = mid;
        } else {
            end = mid - 1;
        }
    }

    return start;
}


/**
 * 
 * @template TKey
 * @param {ArrayLike<TKey>} list 
 * @param {TKey} target 
 * @param {?Number} start 
 * @param {?Number} end 
 */
export const binarySearchContains = (list, target, start, end) => {
    start ??= 0;
    end ??= target.length;

    while (start <= end) {
        const mid = Math.trunc((start + end) / 2);

        if (list[mid] == target) {
            return true;
        } else if (list[mid] < target) {
            start = mid + 1;
        } else {
            end = mid;
        }
    }

    return false;
}