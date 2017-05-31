import $                                from 'jquery'
import PubSub                           from 'pubsub-js'

class Key {
    init() {
        $('.exchanges__key-item').on('click', this.switchKey.bind(this))
    }

    switchKey(e) {
        const $TARGET = $(e.currentTarget)
        if ($TARGET.hasClass('active')) {
            return
        }

        $TARGET.addClass('active').siblings().removeClass('active')
        PubSub.publish('keyChanged')
    }
}

export default Key
