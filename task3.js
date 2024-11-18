const crypto = require('crypto');
const prompt = require('prompt-sync')();
const Table = require('cli-table3');

class Dice {
    constructor(values) {
        if (values.length !== 6) throw new Error("Dice must have exactly 6 values.");
        this.values = values.map(Number);
    }
}

class DiceParser {
    static parseDiceSets(args) {
        if (args.length < 3) {
            throw new Error("You must provide at least 3 dice sets.");
        }
        const diceSets = args.map(arg => {
            const values = arg.split(',').map(Number);
            if (values.length !== 6 || values.some(isNaN)) {
                throw new Error("Each dice must have exactly 6 integer values.");
            }
            return new Dice(values);
        });
        return diceSets;
    }
}

class FairRandom {
    static generateRandomNumber(range) {
        const key = crypto.randomBytes(32).toString('hex');
        const number = crypto.randomInt(range);
        const hmac = crypto.createHmac('sha3-256', key).update(number.toString()).digest('hex');
        return { number, key, hmac };
    }

    static verifyRandomNumber(key, number) {
        return crypto.createHmac('sha3-256', key).update(number.toString()).digest('hex');
    }
}

class ProbabilityCalculator {
    static calculateProbabilities(diceSets) {
        const probabilities = [];
        diceSets.forEach((diceA, i) => {
            probabilities[i] = [];
            diceSets.forEach((diceB, j) => {
                probabilities[i][j] = this.calculateWinProbability(diceA, diceB);
            });
        });
        return probabilities;
    }

    static calculateWinProbability(diceA, diceB) {
        let wins = 0, total = 0;
        diceA.values.forEach(valueA => {
            diceB.values.forEach(valueB => {
                if (valueA > valueB) wins++;
                total++;
            });
        });
        return wins / total;
    }
}

class ProbabilityTable {
    static display(probabilities, diceSets) {
        console.log("Probability of the win for the user:");
        const table = new Table({
            head: ['User dice v', ...diceSets.map(dice => dice.values.join(','))],
            colWidths: Array(diceSets.length + 1).fill(15)
        });

        probabilities.forEach((row, i) => {
            const rowData = [diceSets[i].values.join(',')];
            row.forEach((prob, j) => {
                if (i === j) {
                    rowData.push(`- (${prob.toFixed(4)})`);
                } else {
                    rowData.push(prob.toFixed(4));
                }
            });
            table.push(rowData);
        });

        console.log(table.toString());
    }
}

class Game {
    constructor(diceSets) {
        this.diceSets = diceSets;
    }

    start() {
        const probabilities = ProbabilityCalculator.calculateProbabilities(this.diceSets);
        console.log("Probabilities:", probabilities);

        console.log("Let's determine who makes the first move.");
        const { number, key, hmac } = FairRandom.generateRandomNumber(2);
        console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
        console.log("Try to guess my selection.");
        console.log("0 - 0");
        console.log("1 - 1");
        console.log("X - exit");
        console.log("? - help");

        let guess;
        while (true) {
            guess = prompt('Your guess: ');
            if (guess === 'X') {
                console.log("Exiting...");
                return;
            } else if (guess === '?') {
                ProbabilityTable.display(probabilities, this.diceSets);
            } else if (guess === '0' || guess === '1') {
                break;
            } else {
                console.log("Invalid input. Please enter 0, 1, X, or ?.");
            }
        }

        const guessedNumber = parseInt(guess, 10);
        const verifiedHmac = FairRandom.verifyRandomNumber(key, number);
        console.log(`My selection: ${number} (KEY=${key}).`);
        if (guessedNumber === number) {
            console.log("You make the first move.");
        } else {
            console.log("I make the first move and choose the [6,8,1,1,8,6] dice.");
        }

        console.log("Choose your dice:");
        this.diceSets.forEach((dice, index) => {
            console.log(`${index} - ${dice.values.join(',')}`);
        });
        console.log("X - exit");
        console.log("? - help");

        let diceChoice;
        while (true) {
            diceChoice = prompt('Your selection: ');
            if (diceChoice === 'X') {
                console.log("Exiting...");
                return;
            } else if (diceChoice === '?') {
                ProbabilityTable.display(probabilities, this.diceSets);
            } else if (parseInt(diceChoice, 10) >= 0 && parseInt(diceChoice, 10) < this.diceSets.length) {
                break;
            } else {
                console.log("Invalid input. Please enter a valid dice index, X, or ?.");
            }
        }

        const playerDice = this.diceSets[parseInt(diceChoice, 10)];
        console.log(`You choose the [${playerDice.values.join(',')}] dice.`);

        this.playRound(playerDice);
    }

    playRound(playerDice) {
        console.log("It's time for my throw.");
        let { number: myNumber, key: myKey, hmac: myHmac } = FairRandom.generateRandomNumber(6);
        console.log(`I selected a random value in the range 0..5 (HMAC=${myHmac}).`);
        console.log("Add your number modulo 6.");
        console.log("0 - 0");
        console.log("1 - 1");
        console.log("2 - 2");
        console.log("3 - 3");
        console.log("4 - 4");
        console.log("5 - 5");
        console.log("X - exit");
        console.log("? - help");

        let playerNumber;
        while (true) {
            playerNumber = prompt('Your selection: ');
            if (playerNumber === 'X') {
                console.log("Exiting...");
                return;
            } else if (playerNumber === '?') {
                ProbabilityTable.display(probabilities, this.diceSets);
            } else if (parseInt(playerNumber, 10) >= 0 && parseInt(playerNumber, 10) < 6) {
                break;
            } else {
                console.log("Invalid input. Please enter a number between 0 and 5, X, or ?.");
            }
        }

        playerNumber = parseInt(playerNumber, 10);
        const verifiedHmac = FairRandom.verifyRandomNumber(myKey, myNumber);
        console.log(`My number is ${myNumber} (KEY=${myKey}).`);
        const result = (myNumber + playerNumber) % 6;
        console.log(`The result is ${myNumber} + ${playerNumber} = ${result} (mod 6).`);
        const myThrow = this.diceSets[1].values[myNumber];
        console.log(`My throw is ${myThrow}.`);

        console.log("It's time for your throw.");
        let { number: playerThrowNumber, key: playerThrowKey, hmac: playerThrowHmac } = FairRandom.generateRandomNumber(6);
        console.log(`I selected a random value in the range 0..5 (HMAC=${playerThrowHmac}).`);
        console.log("Add your number modulo 6.");
        console.log("0 - 0");
        console.log("1 - 1");
        console.log("2 - 2");
        console.log("3 - 3");
        console.log("4 - 4");
        console.log("5 - 5");
        console.log("X - exit");
        console.log("? - help");

        while (true) {
            playerNumber = prompt('Your selection: ');
            if (playerNumber === 'X') {
                console.log("Exiting...");
                return;
            } else if (playerNumber === '?') {
                ProbabilityTable.display(probabilities, this.diceSets);
            } else if (parseInt(playerNumber, 10) >= 0 && parseInt(playerNumber, 10) < 6) {
                break;
            } else {
                console.log("Invalid input. Please enter a number between 0 and 5, X, or ?.");
            }
        }

        playerNumber = parseInt(playerNumber, 10);
        const verifiedPlayerHmac = FairRandom.verifyRandomNumber(playerThrowKey, playerThrowNumber);
        console.log(`My number is ${playerThrowNumber} (KEY=${playerThrowKey}).`);
        const playerResult = (playerThrowNumber + playerNumber) % 6;
        console.log(`The result is ${playerThrowNumber} + ${playerNumber} = ${playerResult} (mod 6).`);
        const playerThrow = playerDice.values[playerResult];
        console.log(`Your throw is ${playerThrow}.`);

        if (playerThrow > myThrow) {
            console.log(`You win (${playerThrow} > ${myThrow})!`);
        } else {
            console.log(`I win (${myThrow} >= ${playerThrow})!`);
        }
    }
}

try {
    const diceSets = DiceParser.parseDiceSets(process.argv.slice(2));
    const game = new Game(diceSets);
    game.start();
} catch (error) {
    console.error("Error:", error.message);
    console.log("Usage: node task3.js <6 integers for dice 1> <6 integers for dice 2> <6 integers for dice 3> ...");
    console.log("Example: node task3.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
}