const readline = require('readline');
const NEW_LINE = '\n';
const CARRIAGE_RETURN = '\r';
const END_OF_TRANSMISSION = '\u0004';
function suppressInput(message, char) {
    const input = char.toString('utf8');
    switch (input) {
        case NEW_LINE:
        case CARRIAGE_RETURN:
        case END_OF_TRANSMISSION:
            process.stdin.pause();
            break;
        default:
            process.stdout.clearLine();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${message} `);
            break;
    }
}
function askQuestion(message, { silent = false } = {}) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    if (silent) {
        process.stdin.on('data', char => suppressInput(message, char));
    }
    return new Promise((resolve, reject) => {
        try {
            rl.question(`${message} `, (answer) => {
                rl.history = rl.history.slice(1);
                rl.close();
                return resolve(answer);
            });
        }
        catch (e) {
            rl.close();
            return reject(e);
        }
    });
}
module.exports = askQuestion;
//# sourceMappingURL=ask-question.js.map