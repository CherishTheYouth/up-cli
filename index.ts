#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'

import minimist from 'minimist' // 解析命令行参数包
import prompts from 'prompts'
import { red, green, bold, blue } from 'kolorist'

const init = async () => {
  // 打印cli开始执行提示信息
  console.log(bold(green('-------------------------------------------------')))
  console.log(
    process.stdout.isTTY && process.stdout.getColorDepth() > 8
      ? bold(green('Up-web-vue cli, easier build a web project'))
      : red('Up-web-vue cli, easier build a web project')
  )
  console.log(bold(green('-------------------------------------------------')))

  // 当前node.js 进程执行时的工作目录, 也就是 ts-node index.ts 执行时的目录，后期如果在别的目录执行 cli，就是对应的目录
  const cwd = process.cwd()
  console.log(blue(`current file path: ${cwd}`))

  /**
   * @description process.argv
   * process.argv 属性返回数组，其中包含启动 Node.js 进程时传入的命令行参数。
   * 其中第一个元素是 Node.js 的可执行文件路径，
   * 第二个元素是当前执行的 JavaScript 文件路径，之后的元素是命令行参数。
   * 其余元素将是任何其他命令行参数。
   *  process.argv.slice(2)，可去掉前两个元素，只保留命令行参数部分。
   * 
   * @description minimist
   * 是一个用于解析命令行参数的 JavaScript 函数库。它可以将命令行参数解析为一个对象，方便在代码中进行处理和使用。
   * minimist 的作用是将命令行参数解析为一个对象，其中参数名作为对象的属性，参数值作为对象的属性值。
   * 它可以处理各种类型的命令行参数，包括带有选项标志的参数、带有值的参数以及没有值的参数。
   * 
   * minimist 函数返回一个对象，其中包含解析后的命令行参数。我们可以通过访问对象的属性来获取相应的命令行参数值。
   * 假设我们在命令行中运行以下命令：
   * `node example/parse.js -x 3 -y 4 -n5 -abc --beep=boop foo bar baz`
   * 那么 minimist 将会解析这些命令行参数，并将其转换为以下对象：
   * {
      _: ['foo', 'bar', 'baz'],
      x: 3,
      y: 4,
      n: 5,
      a: true,
      b: true,
      c: true,
      beep: 'boop'
    }
   * 这样，我们就可以在代码中使用 argv.name 和 argv.age 来获取相应的参数值。
   * 除了基本的用法外，minimist 还提供了一些高级功能，例如设置默认值、解析布尔型参数等
   * 
   * const argv = minimist(args, opts={})
   * argv._ 包含所有没有关联选项的参数;
   * “--”之后的任何参数都不会被解析，并将以argv._结束
   * options有：
   * opts.string： 要始终视为字符串的字符串或字符串数组参数名称
   * opts.boolean: 布尔值、字符串或字符串数组，始终视为布尔值。如果为true，则将所有不带等号的'--'参数视为布尔值
   * 如 opts.boolean 设为 true, 则 --save 解析未 save: true
   * 
   * opts.default: 将字符串参数名映射到默认值的对象
   * 
   * opts.stopEarly: 当为true时，用第一个非选项后的所有内容填充argv._
   * 
   * opts.alias: 将字符串名称映射到字符串或字符串参数名称数组,以用作别名的对象
   * 
   * opts['--']: 当为true时，用 '--' 之前的所有内容填充argv._; 用 '--' 之后的所有内容填充 argv['--']
   * e.g.
   * require('./')('one two three -- four five --six'.split(' '), { '--': true })
    {
      _: ['one', 'two', 'three'],
      '--': ['four', 'five', '--six']
    }
  * opts.unknown: 用一个命令行参数调用的函数，该参数不是在opts配置对象中定义的。如果函数返回false，则未知选项不会添加到argv。
  */
  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ['ts', 'TS'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'],
    // all arguments are treated as booleans
    boolean: true
  })

  console.log('argv:', argv)

  // 工程生成文件的文件夹名
  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'up-web-vue' : targetDir

  const forceOverwrite = argv.force // --force 参数

  console.log('forceOverwrite', forceOverwrite)

  let result = {}

  try {
    /**
     * @description prompts
     * prompts 是一个用于创建交互式命令行提示的 JavaScript 库。
     * 它可以方便地与用户进行命令行交互，接收用户输入的值，并根据用户的选择执行相应的操作。
     * 在 prompts 中，问题对象（prompt object）是用于定义交互式提示的配置信息。
     * 它包含了一些属性，用于描述问题的类型、提示信息、默认值等。下面是问题对象的常用属性及其作用：
     * type：指定问题的类型，可以是 'text'、'number'、'confirm'、'select'、'multiselect' 等。不同的类型会影响用户交互的方式和输入值的类型。
     * name：指定问题的名称，用于标识用户输入的值。在返回的结果对象中，每个问题的名称都会作为属性名，对应用户的输入值。
     * message：向用户展示的提示信息。可以是一个字符串，也可以是一个函数，用于动态生成提示信息。
     * initial：指定问题的默认值。用户可以直接按下回车键接受默认值，或者输入新的值覆盖默认值。
     * validate：用于验证用户输入值的函数。它接受用户输入的值作为参数，并返回一个布尔值或一个字符串。
     * 如果返回布尔值 false，表示输入值无效；如果返回字符串，则表示输入值无效的错误提示信息。
     * format：用于格式化用户输入值的函数。它接受用户输入的值作为参数，并返回一个格式化后的值。可以用于对输入值进行预处理或转换。
     * choices：用于指定选择型问题的选项。它可以是一个字符串数组，也可以是一个对象数组。每个选项可以包含 title 和 value 属性，分别用于展示选项的文本和对应的值。
     * onRender：在问题被渲染到终端之前触发的回调函数。它接受一个参数 prompt，可以用于修改问题对象的属性或执行其他操作。
     * 例如，你可以在 onRender 回调中动态修改提示信息，根据不同的条件显示不同的信息。
     * onState：在用户输入值发生变化时触发的回调函数。它接受两个参数 state 和 prompt，分别表示当前的状态对象和问题对象。
     * 你可以在 onState 回调中根据用户的输入值动态修改其他问题的属性或执行其他操作。例如，你可以根据用户的输入值动态更新其他问题的选项。
     * onSubmit：在用户完成所有问题的回答并提交之后触发的回调函数。它接受一个参数 result，表示用户的回答结果。
     * 你可以在 onSubmit 回调中根据用户的回答执行相应的操作，例如保存数据、发送请求等。
    */
    // 收集用户自定义配置
    result = await prompts([
      // 项目名称设置
      {
        name: 'projectName',
        type: targetDir ? null : 'text',
        message: 'Please input project name',
        initial: defaultProjectName,
        onState: (state, prompt) => {
          console.log('state', state)
          console.log('prompt', prompt)
          targetDir = String(state.value).trim() || defaultProjectName
        }
      },
      // 生成项目的文件夹
      {
        name: 'shouldOverwrite',
        type: forceOverwrite ? null : 'confirm',
        message: () => {
          const dirForPrompt = targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`
          return `${dirForPrompt} is not empty. Remove existing files and continue?`
        }
      },
      {
        name: 'overwriteChecker',
        type: (prev, values) => {
          if (values.shouldOverwrite === false) {
            throw new Error('❌' + red(` Operation cancelled`))
          }
          return null
        }
      }
    ], {
      onCancel: () => {
        throw new Error(red('✖') + ' Operation cancelled')
      }
    }).catch((cancelled) => {
      console.log(cancelled.message)
      process.exit(1)
    })
    console.log('result', result)
  } catch (error) {
    console.log(bold(red(`(〃￣︶￣) Emm, Error occurs: ${error}`)))
  }
}

init().catch((error) => {
  console.log(bold(red(`Emm, Error occurs ${error}`)))
})
