module.exports = {
  outputDir: '../renderer-dist',
  publicPath: process.env.NODE_ENV.includes('dev') ? '/renderer-dist' : '../renderer-dist',
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = "Easy-Online Client(Beta version 0.1)";
        return args;
      })
  }
}