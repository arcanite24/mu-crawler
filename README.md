# Marvel Unlimited Crawler

### NodeJS CLI Application to download comics from Marvel Unlimited

#### Setup

- Login into **marvel.com** and extract your cookies.txt with an extension. You can use [https://chrome.google.com/webstore/detail/cookiestxt/njabckikapfpffapmjgojcnbfjonfjfg](cookies.txt)
- Put your new cookies.txt on the root of this project
- Find an issue ID or a series ID and execute the following command `node index.js --issue ISSUE_ID` or `node index.js --serie SERIE_ID`
- If you want to use the search functions put your PUBLIC KEY on a file called **key.txt** under the root of the project, the first line is for the public key and the second line is for the private key

#### TODO

- General refactor, the code is dirty AF
- Implement a more robust CLI framework
- Optimize the worker thread, for now it's literally the code from the docs
- Abstract some funcionality to enable usage without the CLI
- Add a more robust logging framework, maybe progress bars and speed per file
- IMPORTANT: Let the system crawl the entire series, for now only gathers the first 20 items, maybe a limit is the solution
