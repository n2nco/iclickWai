

let dotenv = require('dotenv')
dotenv.config()
var env = process.env.ENV

let isDocker = require('./isDocker.js')

var moment = require('moment-timezone');
global.PST_ZONE = "America/Los_Angeles"
global.EST_ZONE = "America/New_York"
global.MST_ZONE = "America/Denver"
global.CST_ZONE = "America/Chicago"
global.UTC_ZONE = "Etc/UTC"
console.log('current time in PST:')
console.log(moment().tz(PST_ZONE).format())

let { img_down, get_answer, click_answer } = require('./ai.js')


try {

const puppeteer = require('puppeteer')
exports.handler = async (event, context, callback) => {
    //do i need this below?
    // var credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
    // AWS.config.credentials = credentials;

    if (process.env.ENV == 'docker') {
        console.log('running in docker')
        let data = JSON.parse(process.env.DATA) //passed in on docker run
        //do i need to parse?
      
    }

    console.log('running handler - printing event:');
    console.log(event)
    // console.log(context)
    // console.log(callback);

    console.log('assigning event variables to global')
    Object.assign(global, event)
    await scheduleExit()
    console.log(global)
    console.log(daysAndTimes)


    let result = null;
    let browser = null;


    try {
        console.log('trying to launch chromium.puppeteer')


        let browser
        // let x = isDocker()
        if (isDocker()) {
            console.log('running in docker - isDocker() == true - launching puppeteer w /usr/bin/chromium-browser')
            //console.log('ENV is not dev. launching puppeteer with args')
            browser = await puppeteer.launch({
                headless: true,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                    '--no-sandbox',
                    '--disable-gpu',
                ]
            })
        }
        else {
         browser = await puppeteer.launch({ headless: false})
        }



        global.browser = browser


        page = await browser.newPage()
        global.page = page
        await page.goto('https://student.iclicker.com/#/login')
        console.log('completed goto')

        // pageList = ['#login-page', '#courses-page', "#course-screen", ".unified-check-in-icon", "polling"]
        // console.log('page were on: ')

        // let x = await page.waitFor(() => document.querySelectorAll('#login-page', '#courses-page', '.question-type-banner', "#course-screen", ".unified-check-in-icon").length);

        const getPageWereOn = async () => {
            try {
                const element = await Promise.race([
                    page.waitForSelector('#login-page'),
                    page.waitForSelector('#courses-page'),
                    page.waitForSelector("#course-screen"),
                    page.waitForSelector("#btnJoin"),
                    page.waitForSelector("#polling"),
                    page.waitForSelector('ngx-open-multiple-answer-component')
                ]);

                global.id = await element.getProperty('id')
                global.idJson = await id.jsonValue()
                global.y = await element.getProperty('className')
                global.z = await element.getProperty('selector')
                global.elJSON = await element.jsonValue()


                let idIsEmptyString = (idJson === '')

                if (idIsEmptyString) {
                    console.log('id is empty string. logging/returning selector')
                    console.log(await element.getProperty('selector'))
                    global.foundEmptyStrig = true

                }

                if (id && !idIsEmptyString) {
                    console.log('element.getProperty("id"): in json: ' + idJson)

                    let pageWereOn = await (await element.getProperty('id')).jsonValue(); //?? neds ID & class!! b/c unified-check-in-icon is a class and not an ID
                    console.log('pageWereOn: ' + pageWereOn)
                    global.pageWereOn = pageWereOn
                    return pageWereOn
                }
                //  else if (await element.getProperty('className')) {
                //     console.log('found class name instead of id as page identifier')
                //     return await (await element.getProperty('className')).jsonValue();
                // }

                else {
                    console.log('found selector indicating multiple answer compondent. Printing el:')
                    console.log(element)
                    // if (element.length > 1) { 
                    console.log('found ngx multi selector & the elements length is > 1')
                    let elseRet = (await (await element.getProperty('selector')).jsonValue())
                    console.log('elseRet: ' + elseRet)

                    return elseRet
                    //  }
                    // return

                }
            } catch (e) {


                console.log('error caught waiting for page-indicating selector')
                console.log(e)
                clickMultipleAnswers()
            }
        }

        global.latestQuestionNumber = {
            text: null,
            answer: null
        }
        async function progress() {
            let pageOn = null
            pageOn = await getPageWereOn()
            console.log('pageOn from progress call: ' + pageOn)
            switch (pageOn) {
                case 'login-page':
                    await page.waitForSelector('#userEmail')
                    await page.type('#userEmail', email)
                    await page.waitForSelector('#userPassword')
                    await page.type('#userPassword', password)
                    await page.waitForSelector('#sign-in-button')
                    await page.click('#sign-in-button')
                case 'courses-page':
                    await page.waitForSelector('.course-title')
                    await page.evaluate(async ({ courseDpt, courseNumber }) => {
                        console.log("courseDpt   + ' ' + courseNumber")
                        console.log(courseDpt + ' ' + courseNumber)
                        let x = document.getElementsByClassName("course-title")
                        let courses = Array.from(x)
                        console.log('got courses: ' + courses)
                        x[courses.findIndex((item) => { return ( item.innerHTML.includes(courseDpt) || (item.innerHTML.toLowerCase().includes(courseDpt.toLowerCase())))/* case insensitive */ && item.innerHTML.includes(courseNumber) })].click() //new
                    }, { courseDpt, courseNumber })
                case 'course-screen':
                    console.log('found course-screen')
                    // await page.waitForNavigation();
                    await page.waitForSelector('#btnJoin', {
                        visible: true,
                        timeout: 0
                    })
                    console.log('found btnJoin, about to click it')
                    await page.waitForTimeout(3000);
                    try { await page.click('#btnJoin') } catch (e) { console.log('error caught - no id of btnJoin in questionPage.js') }
                case 'unified-check-in-icon':
                    //when checked in & no MCQ posted, wait for poll or quiz
                    console.log('found unified-check-in-icon - not calling clickanswers')

                // await clickAnswers()
                case 'polling':
                    // await page.waitForSelector('#question-type-banner', {
                    //     visible: true,
                    // })
                    let qNumText = await page.evaluate( async() => { let e = document.querySelector('#polling > div.navbar > h1'); if (e) return e.innerHTML ?? null });
                    if (qNumText !== latestQuestionNumber.text || !latestQuestionNumber.answer) {
                        console.log('new question found')
                    
                        
                          
                        let imgSrc = await page.evaluate( async() => {
                            try{
                                const img_element = await document.querySelector('#polling > div.question-image-container.ng-isolate-scope > img');
                                const src = await img_element.getAttribute('src');
                                return src
                            } catch(e) { console.log('error caught in img_src eval') }
                        })
                        if (imgSrc) {
                            await img_down(imgSrc) //which calls read_and_
                            let ans = await get_answer()
                            let clicked = await click_answer(ans, page)
                            if (clicked) {
                                latestQuestionNumber.text = qNumText  
                                latestQuestionNumber.answer = ans
                                console.log('answer clicked & latestQuestionNumber.answer set to: ' + latestQuestionNumber.answer)
                            }
                        }
                    }

                    // console.log('found Polling element - calling clickAnswers')
                    // await clickAnswers()
                case 'ngx-open-multiple-answer-component':
                    // await page.waitForSelector('#question-type-ifbanner', {
                    //     visible: true,
                    // })
                    let qNumText2 = await page.evaluate( async() => { let e = document.querySelector('#polling > div.navbar > h1'); if (e) return e.innerHTML ?? null });
                    //if questiontext or answer are not present
                    if (!(latestQuestionNumber.text == qNumText2) || !latestQuestionNumber.answer) {
                
                    let imgSrc = await page.evaluate( async() => {
                        try{
                            const img_element = await document.querySelector('#polling > div.question-image-container.ng-isolate-scope > img');
                            const src = await img_element.getAttribute('src');
                            return src
                        } catch(e) { console.log('error caught in img_src eval') }
                    })
                    if (imgSrc) {
                        await img_down(imgSrc) //which calls read_and_
                    

                        let ans = await get_answer()
                        let clicked = await click_answer(ans, page)
                        if (clicked) {
                            latestQuestionNumber.text = qNumText2
                            latestQuestionNumber.answer = ans
                            console.log('answer clicked & latestQuestionNumber.answer set to: ' + latestQuestionNumber.answer)
                        }

                        else //if not clicked, click random answer
                        {
                            latestQuestionNumber.answer = null
                            console.log('found npx open multiple answer component. pageOn: ' + pageOn)
                            await clickMultipleAnswers()
                        }
                    }

            
                }


                default:
                    //if (classtime +10mins not ended, and not on 1st 3 pages), progress
                    // let p = await getPageWereOn()
                    console.log('running the default in progress')
                    let time = new Date().toLocaleTimeString()
                    console.log('time' + time)
                    await page.waitForTimeout(2000)
                    await progress()
            }

        }
        await progress()

    } catch (e) {
        console.log('error: ')
        console.log(e)
    }
    return 'ran index.js'
}

async function clickAnswers() {
    await page.evaluate(async () => {
        console.log('running clickAnswers')
        try {
            let letters = ["a", "b", "c", "d"];
            let randomLetter = letters[Math.floor(Math.random() * letters.length)];
            console.log('randomLetter: ' + randomLetter)
            console.log("document.title-p e")
            console.log(document.title)

            let answerReceived = document.getElementById('status-text-container-id')?.innerHTML?.includes('Answer Received')
            let questionConcluded = document.getElementsByClassName('answer-label')[0]?.innerHTML?.includes('Your Answer:')
            if (answerReceived) { console.log('answer for this q already received') }
            if (questionConcluded) { console.log('question concluded') }
            if (!answerReceived && !questionConcluded) {
                console.log('answer for this q not already received')
                let btnElement = document.getElementById(`multiple-choice-${randomLetter}`);
                if (btnElement) {
                    btnElement.click();
                    console.log(`multiple-choice-${randomLetter} clicked`)
                    return true
                    // wasAnswerSelected = true
                }
                else { //if a quiz pops up // might want to re-work this as now it's dependenft on child elements structure
                    let quizMcqBtn = document.querySelector("#quizzing-question > div:nth-child(5) > div > div:nth-child(1) > button")
                    if (quizMcqBtn) {
                        console.log('quizMcqAnswerFound. Clicking now.')
                        quizMcqBtn.click()
                        return true
                    }

                }
            }
        }
        catch (e) {
            console.log('error caught - no id of multuple-choice-a in questionPage.js')
            console.log(e)
            return false
        }
    })
}


async function clickMultipleAnswers() {
    console.log('running clickMuktipleAnswers----------')
    try {
        console.log('inside try')
        await global.page.evaluate(async () => {
            console.log('running clickMuktipleAnswers---------- inside eval')
            try {
                console.log("document.title:")
                console.log(document.title)

                let letters = ["A", "B", "C", "D"];
                let randomLetter = letters[Math.floor(Math.random() * letters.length)];
                let randomLetter2 = letters[Math.floor(Math.random() * letters.length)];
                console.log('randomLetter1: ' + randomLetter)


                //   let answerReceived = document.getElementById('status-text-container-id')?.innerHTML?.includes('Answer Received')
                //   let questionConcluded = document.getElementsByClassName('answer-label')[0]?.innerHTML?.includes('Your Answer:')
                //   if(answerReceived) {console.log('answer for this q already received')}
                //   if(questionConcluded) {console.log('question concluded')}
                //   if (!answerReceived && !questionConcluded) {
                // console.log('answer for this q not already received')

                setTimeout(() => {

                    let btnElement2 = document.getElementById(`multiple-choice-${randomLetter2}`);
                    if (btnElement2) {
                        // btnElement2.click();
                        // console.log(`multiple-choice-${randomLetter2} clicked`)

                        let mc = document.querySelector('.multiple-choice-buttons')


                        let btnsArr2 = Array.from(mc.childNodes)
                        let btnsArr3 = btnsArr2.map((el) => el.childNodes[0])

                        let areAnyPressed = btnsArr3.filter((el, index) => el.ariaPressed === 'true')
                        btnsArr3.sort(function (a, b) { return 0.5 - Math.random() }); // shuffle array to randomiz 3 buttons selected
                        let indexOfNotPressed = btnsArr3.findIndex((el, index) => el.ariaPressed === 'false')

                        if (areAnyPressed.length < 3) {
                            console.log('no btns clicked!')
                            console.log('clicking(btns[indexOfNotPressed])')
                            btnsArr3[indexOfNotPressed].click()
                            console.log('clicked(btns[indexOfNotPressed])---')

                        }


                        let sendAnsBtn = document.getElementsByClassName('send-answer-btn')
                        if (sendAnsBtn) { sendAnsBtn[0].click() }
                        return true
                    }


                    else { //if a quiz pops up // might want to re-work this as now it's dependenft on child elements structure
                        let quizMcqBtn = document.querySelector("#quizzing-question > div:nth-child(5) > div > div:nth-child(1) > button")
                        if (quizMcqBtn) {
                            console.log('quizMcqAnswerFound. Clicking now.')
                            quizMcqBtn.click()
                            return true
                        }
                    }
                }, 1400)
                return true //NEW
                // }
            }
            catch (e) {
                console.log('error caught - no id of multuple-choice-a in questionPage.js')
                console.log(e)
                return false
            }
        })
    }
    catch (e) {
        console.log('error caught at high level catch in clickMultiAnswers()')
        console.log(e)
        return false
    }

}


//bring in test data from .env file
if (env == 'dev' || env == 'docker') {
    console.log('evn is dev. logging process.env.TEST_DATA')
    console.log(process.env.TEST_DATA)
    let test_data = JSON.parse(process.env.TEST_DATA)
    console.log(test_data)
    var event = test_data

    exports.handler(event)
}else {
    let test_data = JSON.parse(process.env.TEST_DATA)
    console.log(test_data)
    var event = test_data

    exports.handler(event)
}


// //bring in test data from .env file
// if (env == 'docker') {
//     console.log('env is docker. logging process.env.TEST_DATA')
//     console.log(process.env.TEST_DATA)
//     let test_data = JSON.parse(process.env.TEST_DATA)
//     console.log(test_data)
//     var event = test_data

//     exports.handler(event)

// }

//intercept SIGTERM - not sure if works
process.on('SIGTERM', async () => {
    console.info('[runtime] SIGTERM received');
    await scheduleExit()
});

}
//top level catch
catch(e) {
    console.log('error caught at top level catch in index.js')
    console.log(e)
  
}
//exit process when 
async function scheduleExit() {
    //get day of week in users' course timezone
    let dayOfWeek = new Date().toLocaleString("en-US", {  timeZone: global[`${timezone}_ZONE`],  weekday: 'long' }).toLowerCase()
      console.log("dayOfWeek:")
      console.log(dayOfWeek)
      let tzStr = global[`${timezone}_ZONE`]
      let startT = moment().tz(`${tzStr}`).format("HH:mm")
      let startTObj = moment(startT, "HH:mm")
      let endT =  moment(daysAndTimes[dayOfWeek][1], "HH:mm")

      //get diff
      let diff = moment.duration(endT.diff(startTObj))
      console.log("diff in ms, then m:")
      console.log(diff._milliseconds)
      console.log(diff._milliseconds / 1000 / 60)

      //setTimeout for exit
        setTimeout(async () => {
            console.log('[runtime] exiting at time:' + moment().tz(`${tzStr}`).format("HH:mm"))
            try {
                await global.browser.close()
                process.exit(0)
            } catch (error) {
                console.log('error closing browser in SIGTERM hook' + error)
            }
  
        }, diff._milliseconds + (1000 * 60  * 15)) //run for an extra 15 mins after class ovr
}
