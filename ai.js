
const fs = require('fs');
let Tesseract = require('tesseract.js');


// const cv = require('opencv');

// cv.readImage('./img/myImage.jpg', function (err, img) {
//   if (err) {
//     throw err;
//   }

//   const width = im.width();
//   const height = im.height();

//   if (width < 1 || height < 1) {
//     throw new Error('Image has no size');
//   }

//   // do some cool stuff with img

//   // save img
//   img.save('./img/myNewImage.jpg');
// });




async function img_down(src) {
    if (src) {
        try {
// 
            // const cv = require('opencv4nodejs');
            // const image = cv.imread('questionImg.jpg');


        //   const img_element = await page.querySelector('#polling > div.question-image-container.ng-isolate-scope > img');
        //   const src = await img_element.getAttribute('src');
        console.log('img src from img_down', src);
        
        const response = await fetch(src);
        const imgBlob= await response.blob();
        const imgArrayBuffer = await imgBlob.arrayBuffer();
        const imgBuffer = Buffer.from(imgArrayBuffer);



        //   const file = new File([img_content], 'questionImg.png', { type: 'image/png' });
        fs.writeFile('questionImg.png', imgBuffer, (err) => {
            if (err) {
            console.error(err);
            return;
            }
        
            // console.log(`File created: ${filePath}`);
        });
        return true
        } catch(error) {
            console.log('Error in img_down:', error);
            return false
        }
    }
}


  
      
      
async function get_answer() {
    // const openai = require('openai');

    try {
        let pyTtext = await Tesseract.recognize('questionImg.png', 'eng', { logger: m => console.log(m) }, '--psm 1' )
        // let pyTtext2 = await Tesseract.recognize('questionImg.png', 'eng', { logger: m => console.log(m) }, '--psm 4' )
        // let pyTtext3 = await Tesseract.recognize('questionImg.png', 'eng', { logger: m => console.log(m) }, '--psm 6' )
        // let pyTtext4 = await Tesseract.recognize('questionImg.png', 'eng', { logger: m => console.log(m) }, '--psm 0' )

        // let pyTtext = await Tesseract.recognize('questionImg.png', 'eng', { logger: m => console.log(m) }, '--psm 7')
        console.log('pyTtext--------1: ', pyTtext.data.text)
        // console.log('pyTtext--------4: ', pyTtext2.data.text)
        // console.log('pyTtext--------6: ', pyTtext3.data.text)
        // console.log('pyTtext--------0: ', pyTtext4.data.text)

        
        const prompt = `You are a multiple choice answering bot. You are given text read from images containing multiple choice questions inside. Please extract the multiple choice question from this text, and answer the question, respond with the correct multiple choice answer. Browsing: enabled. \n
        Example text: 
        "Coase Theorem implies that private parties can solve
        ernalitiy problems independantly if:
        They can bargain over the allocation of resource use by
        methods of payment.
        They can bargain over the allocation of resource use
        without cost and other impediments. |
        The government is involved.
        They ignore all costs to third parties.
        Only when there are many independent parties on each
        side of the bargaining, avoiding monopolistic behaviour.
        ler 2 ; e > 772" a9 e - — | - ; 72 S = = | - \ | 4
        PBOC=RO0 6 B8 790NN E0 ¥ oQPRE 0T QOQ A =~"

        Example answer:
        "B. They can bargain over the allocation of resource use
        without cost and other impediments." \n\n 
        
        Example question 2:
        @ WhatsApp File Edit View Chat Call Window Help @ © N 3 ® ® Q Q- ® ThuDecs 3:08PM
        l? ,. B NoConfigurstions ”,,lkgjgtw [?p,mm sals X ouestionmgpng TS indexdis s isDockeris ..enjirjs_idmkerwai I 5 . Efigrf%ztti%z%:m:{)l;?mvlvzltehyiii;ax L!) |
        Which of the following cities is NOT among the top twenty most
        polluted major cities in the world on 22 September 2022?
        Wuhan (China)
        E Dubai (United Arab Emirates) |
        Jakarta (Indonesia)
        Johannesburg (South Africa)
        Seoul (South Korea)
        CERCEEEE S LA A/ OEEE -0~ 0OGNEL =i ]

        Example answer 2:
        D. Johannesburg (South Africa) \n\n
        
        Here's your text: \n${pyTtext.data.text}\n\n`;
       
        // openai.apiKey = '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'

        const { Configuration, OpenAIApi } = require("openai");
        const configuration = new Configuration({
        apiKey: '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'
        });

        const openai = new OpenAIApi(configuration);
        const response = await openai.createCompletion({
            model:"text-davinci-003", prompt:prompt, temperature:0.0, best_of:10, n:3, max_tokens:90, logprobs:5
        });
        // const response = await openai.Completion.create(model="text-davinci-003", prompt="Hello, world!", temperature=0.02, best_of=10, n=3, max_tokens=50, logprobs=5);

        const ansRaw = response?.data.choices[0].text;
        console.log('answer from api:', response?.data.choices[0].text)
        const pattern = /Answer:\s+([A-E])/;

        // Use the regular expression to find the answer
        const match = ansRaw.match(pattern);
        let ans
        if (match) ans = match[1];
        else {
        ans = ansRaw.split('.')[0];
        ans = ans.split(')')[0];
        }
        
        ans = ans.toLowerCase();
        return ans;
    }
    catch (error) {
        console.log('Error in read_and_answer:', error);
    }
}

// get_answer()

    
async function click_answer(ans, page) {
    try {
    //   const ansLetter = read_and_answer(); //CALLS BELOW
    let ansLetter 
      console.log('answer letter retreived: ' + ans)

    //   }
    //   let js_template = `
    //     async function f() {
    //         try {
    //             angular.element(document.querySelector('#multiple-choice-ans')).triggerHandler('click');
    //             return true
    //         } catch(err) {
    //             console.log('error clicking el' + err);
    //             return false
    //         }
    //     }
    //   `;
    //   js_template = js_template.replace('ans', ansLetter);
      let didClick = await page.evaluate(  async function f(ans) {
        try {
            angular.element(document.querySelector('#multiple-choice-' + ans)).triggerHandler('click');
            return true
        } catch(err) {
            console.log('error clicking el' + err);
            return false
        }
        }, ans);
        console.log('did it click?', didClick ? 'yes' : 'no')
        console.log('clicked answer letter: ', ans)
        // if ans is not  one of A, B, C, D, E return false
        let x = (ans === "a" || ans === "b" || ans === "c" || ans === "d" || ans === "e") ? true : false;
        if (x == false) console.log('ans is not one of a,b,c,d,e');
        return didClick && x;
        } 
        catch (error) {
        console.log('Error in img_down:', error);
        }
    }
    


// get_answer()
module.exports = { img_down, get_answer, click_answer }
