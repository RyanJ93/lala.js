# The Lala.js contributing guide

Welcome to the contributing guide of the Lala.js project, we are happy to see you are interested in our work, here you are some useful information you should take care of if you are intended to help in this project maintenance and growth.
<br />The main purpose of this document is to define what instruments, channel and methodologies we use to work with Lala.

## What you can do to help

Because this is a new project built from scratch, we are seeking your support to improve our work, there are many ways you can help us depending on what kind of commitment you are available for; here's a short list of what kind of help we are currently looking for:

* Framework testing: you can try out this project on your own to find out unexpected behaviours, bugs or useful features to add.
* Proposing new features based on your development experiences helping us to add great functionalities that can improve projects quality and development speed.
* Spread this work among your community.
* Join to this project development by contributing according to our Kanban board.
* Improve the framework documentation (on GitHub's wiki and the official website) and the example set currently available.

## Bug and features report

We will be very thankful to you whenever reporting issues found while using Lala.js, you can send your reports opening an _issue_ in this GitHub repository or, if you prefer, you can directly open a task on our YouTrack Kanban board, note that this will require you to have an authorized account, more information about Lala's Kanban board below.
Please note that if you are going to report a security problem you should prefer a more confidential way: please report security issues by sending an e-mail to ryanj93@lalajs.moe.

## Communicating

You can interact with the development community as well as stay tuned to updates through those channels:

- [Slack](https://join.slack.com/t/lalajs/shared_invite/zt-bq06yw7m-_88xeSAc7YH~1ytbE_AdJg)
- [Discord](https://discord.gg/PpNS22)
- [Telegram](https://t.me/1287126580) (read-only channel)

## Work organization

We like keeping all organized dividing jobs, issues and features into tasks, you can have a look, create, discuss and edit tasks on our Kanban board and AGILE platform, guests are free to view the board and interact with currently planned work while if you are intended to add or edit currently added work you should ask for a valid account, see below how to request an account.
We use JetBrains's YouTrack software for this purpose, check our instance [homepage](https://youtrack.lalajs.moe/) and [Kanban board](https://youtrack.lalajs.moe/agiles/97-0/98-0).

## Before starting

Make sure to install your project copy on your local environment with all required dependencies and additional software, more specifically, make sure you are running Node.js version 13 or greater and latest NPM version.
You may need more additional modules and external software depending on what kind of configuration are you intended to run, for instance, you may need to install Redis and the `redis` Node module if you are going to use it as a storage engine for sessions and/or cache, or you may also need a database such as MongoDB, MySQL and so on.

## Code of Conduct

Contributors are free to fork and submit pull requests: when doing your stuff, make sure to follow some few practices:

1. Be compliant to the coding style adopted by the project.
2. Make sure to comment and document your work to allow other people to understand how it works and how can be used.
3. Try & test your work, especially if you are fixing an existing bug.

Pull requests can be submitted by anyone, however, before being closed and eventually merged, submitted changes are reviewed by the staff to ensure compliance to the contributing rules and check that everything else is still fine and working; your contributions may be edited before being merged into the main branches.
<br />Don't forget to describe your changes when submitting your pull request, this allows us to understand your work more deeply.

### Difference between tried and tested.

If you are going to contribute to this project don't forget to test your work. When we talk about tests, we mean that you should write unit tests that prove your code is working. Trying your code without testing it is not enough in most of the cases, here's why:

- Alice issued a great new feature: it works fine but no test has been written for it.
- Bob, after some months, decide to change something to Alice's code, he both try and test its code and everything looks fine.
- Caitlyn is using Lala.js and, after a new update, she notices something has broken, then she submit a new issue.

To sum up: Bob has broken something while working on Alice's code, but he didn't know how original code was tried, then everything seemed to be ok to him until the issue came up.

## Branches

We divide our code into three main branches:

- **master**: it is the release branch, all stable yet released changes are merged here once ready.
- **beta**: this is the beta branch that corresponds to the nightly release, it is meant to be used to test and try out a release before merging it into the master branch.
- **dev**: it is the branch where pull requests submitted are merged into once ready.

## Request an account

To use the YouTrack kanban board, you are required to have an account: you can request your email/YouTrack account by sending an email to ryanj93@lalajs.moe containing those piece of information:

- Your info: name, surname, email address, country and language.
- Some info about your skills.
- A link to your main GitHub profile.

Once your account submission is reviewed, an email address @lalajs.moe will be assigned to you as well as a YouTrack account.
