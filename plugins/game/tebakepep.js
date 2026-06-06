import { games } from '../../src/lib/ourin-games.js'

games.register('tebakepep', {
    alias: ['tebakff', 'tebakfreefire'],
    emoji: '🔫',
    title: 'TEBAK EPEP',
    description: 'Tebak nama karakter Free Fire dari deskripsi kemampuan',
    hasImage: false
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakepep')
export { pluginConfig as config, handler, answerHandler }
