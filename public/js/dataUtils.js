// public/js/dataUtils.js
// Advanced Data Processing Utilities

import _ from 'lodash-es';
import * as R from 'ramda';
import { format, formatDistance, formatRelative } from 'date-fns';
import dayjs from 'dayjs';
import numeral from 'numeral';
import * as math from 'mathjs';
import validator from 'validator';
import { z } from 'zod';

class DataUtils {
    constructor() {
        this.lodash = _;
        this.ramda = R;
        this.math = math;
        this.validator = validator;
        this.zod = z;
    }

    // Initialize
    init() {
        console.log('✅ Data utilities initialized');
    }

    // Lodash utilities
    lodashUtils = {
        // Array operations
        chunk: (array, size) => _.chunk(array, size),
        compact: (array) => _.compact(array),
        uniq: (array) => _.uniq(array),
        flatten: (array) => _.flatten(array),
        groupBy: (array, key) => _.groupBy(array, key),
        sortBy: (array, key) => _.sortBy(array, key),
        
        // Object operations
        pick: (obj, keys) => _.pick(obj, keys),
        omit: (obj, keys) => _.omit(obj, keys),
        merge: (...objs) => _.merge({}, ...objs),
        cloneDeep: (obj) => _.cloneDeep(obj),
        
        // String operations
        camelCase: (str) => _.camelCase(str),
        snakeCase: (str) => _.snakeCase(str),
        kebabCase: (str) => _.kebabCase(str),
        capitalize: (str) => _.capitalize(str),
        
        // Function operations
        debounce: (func, wait) => _.debounce(func, wait),
        throttle: (func, wait) => _.throttle(func, wait),
        memoize: (func) => _.memoize(func)
    };

    // Ramda utilities (Functional programming)
    ramdaUtils = {
        // Composition
        compose: (...fns) => R.compose(...fns),
        pipe: (...fns) => R.pipe(...fns),
        
        // Array operations
        map: R.map,
        filter: R.filter,
        reduce: R.reduce,
        find: R.find,
        
        // Object operations
        prop: R.prop,
        path: R.path,
        assoc: R.assoc,
        dissoc: R.dissoc,
        
        // Logic
        cond: R.cond,
        ifElse: R.ifElse,
        when: R.when,
        unless: R.unless
    };

    // Date utilities
    dateUtils = {
        // Format date
        format: (date, formatStr) => format(new Date(date), formatStr),
        
        // Relative time
        timeAgo: (date) => formatDistance(new Date(date), new Date(), { addSuffix: true }),
        
        // Relative format
        relative: (date) => formatRelative(new Date(date), new Date()),
        
        // Dayjs operations
        now: () => dayjs(),
        parse: (date) => dayjs(date),
        add: (date, amount, unit) => dayjs(date).add(amount, unit),
        subtract: (date, amount, unit) => dayjs(date).subtract(amount, unit),
        diff: (date1, date2, unit) => dayjs(date1).diff(dayjs(date2), unit),
        isBefore: (date1, date2) => dayjs(date1).isBefore(dayjs(date2)),
        isAfter: (date1, date2) => dayjs(date1).isAfter(dayjs(date2))
    };

    // Number utilities
    numberUtils = {
        // Format numbers
        format: (num, format = '0,0') => numeral(num).format(format),
        
        // Currency
        currency: (num) => numeral(num).format('$0,0.00'),
        
        // Percentage
        percentage: (num) => numeral(num).format('0.00%'),
        
        // File size
        fileSize: (bytes) => numeral(bytes).format('0.0b'),
        
        // Abbreviate
        abbreviate: (num) => numeral(num).format('0.0a')
    };

    // Math utilities
    mathUtils = {
        // Basic operations
        add: (...nums) => math.add(...nums),
        subtract: (...nums) => math.subtract(...nums),
        multiply: (...nums) => math.multiply(...nums),
        divide: (...nums) => math.divide(...nums),
        
        // Advanced operations
        sqrt: (num) => math.sqrt(num),
        pow: (base, exp) => math.pow(base, exp),
        log: (num) => math.log(num),
        exp: (num) => math.exp(num),
        
        // Trigonometry
        sin: (num) => math.sin(num),
        cos: (num) => math.cos(num),
        tan: (num) => math.tan(num),
        
        // Statistics
        mean: (array) => math.mean(array),
        median: (array) => math.median(array),
        std: (array) => math.std(array),
        variance: (array) => math.variance(array),
        
        // Matrix operations
        matrix: (data) => math.matrix(data),
        transpose: (matrix) => math.transpose(matrix),
        det: (matrix) => math.det(matrix),
        inv: (matrix) => math.inv(matrix),
        
        // Evaluate expressions
        evaluate: (expr) => math.evaluate(expr)
    };

    // Validation utilities
    validationUtils = {
        // Email
        isEmail: (str) => validator.isEmail(str),
        
        // URL
        isURL: (str) => validator.isURL(str),
        
        // Numbers
        isInt: (str) => validator.isInt(str),
        isFloat: (str) => validator.isFloat(str),
        
        // Strings
        isAlpha: (str) => validator.isAlpha(str),
        isAlphanumeric: (str) => validator.isAlphanumeric(str),
        
        // Dates
        isDate: (str) => validator.isDate(str),
        
        // Credit cards
        isCreditCard: (str) => validator.isCreditCard(str),
        
        // IP addresses
        isIP: (str) => validator.isIP(str),
        
        // JSON
        isJSON: (str) => validator.isJSON(str),
        
        // Length
        isLength: (str, options) => validator.isLength(str, options),
        
        // Custom validators
        matches: (str, pattern) => validator.matches(str, pattern)
    };

    // Zod schema validation
    zodSchemas = {
        // User schema
        user: z.object({
            name: z.string().min(1).max(100),
            email: z.string().email(),
            age: z.number().int().positive().optional(),
            role: z.enum(['user', 'admin', 'moderator'])
        }),
        
        // File schema
        file: z.object({
            name: z.string(),
            path: z.string(),
            size: z.number().positive(),
            type: z.string(),
            content: z.string()
        }),
        
        // Config schema
        config: z.object({
            theme: z.enum(['light', 'dark', 'auto']),
            fontSize: z.number().min(8).max(72),
            tabSize: z.number().int().min(1).max(8),
            wordWrap: z.boolean()
        })
    };

    // Validate data with Zod
    validate(data, schemaName) {
        try {
            const schema = this.zodSchemas[schemaName];
            if (!schema) {
                throw new Error(`Schema '${schemaName}' not found`);
            }
            return schema.parse(data);
        } catch (error) {
            console.error('Validation error:', error);
            throw error;
        }
    }

    // Safe validate (returns result object)
    safeValidate(data, schemaName) {
        try {
            const schema = this.zodSchemas[schemaName];
            if (!schema) {
                return { success: false, error: `Schema '${schemaName}' not found` };
            }
            const result = schema.safeParse(data);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Data transformation pipeline
    pipeline(data, ...operations) {
        return operations.reduce((result, operation) => operation(result), data);
    }

    // Example pipelines
    examplePipelines = {
        // Process user data
        processUsers: (users) => this.pipeline(
            users,
            (data) => _.filter(data, user => user.active),
            (data) => _.sortBy(data, 'name'),
            (data) => _.map(data, user => ({
                ...user,
                displayName: _.capitalize(user.name)
            }))
        ),
        
        // Process file data
        processFiles: (files) => this.pipeline(
            files,
            (data) => _.filter(data, file => file.size > 0),
            (data) => _.groupBy(data, 'type'),
            (data) => _.mapValues(data, group => ({
                count: group.length,
                totalSize: _.sumBy(group, 'size')
            }))
        )
    };

    // Show utilities demo
    showDemo() {
        const demo = `
            <h3>Data Utilities Demo</h3>
            <div style="font-family: monospace; font-size: 12px;">
                <h4>Lodash Examples:</h4>
                <pre>_.chunk([1,2,3,4,5], 2) → ${JSON.stringify(_.chunk([1,2,3,4,5], 2))}</pre>
                <pre>_.camelCase('hello world') → ${_.camelCase('hello world')}</pre>
                
                <h4>Date Examples:</h4>
                <pre>timeAgo(Date.now() - 3600000) → ${formatDistance(Date.now() - 3600000, Date.now(), { addSuffix: true })}</pre>
                
                <h4>Number Examples:</h4>
                <pre>currency(1234.56) → ${numeral(1234.56).format('$0,0.00')}</pre>
                <pre>fileSize(1234567) → ${numeral(1234567).format('0.0b')}</pre>
                
                <h4>Math Examples:</h4>
                <pre>mean([1,2,3,4,5]) → ${math.mean([1,2,3,4,5])}</pre>
                <pre>evaluate('sqrt(16) + 2^3') → ${math.evaluate('sqrt(16) + 2^3')}</pre>
                
                <h4>Validation Examples:</h4>
                <pre>isEmail('test@example.com') → ${validator.isEmail('test@example.com')}</pre>
                <pre>isURL('https://example.com') → ${validator.isURL('https://example.com')}</pre>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>📊 Data Utilities</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${demo}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

export const dataUtils = new DataUtils();
export default dataUtils;
