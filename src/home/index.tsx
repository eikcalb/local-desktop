import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { notify, IMessage } from 'src/notification';
import ILocalStore from 'src/store';
import { APPLICATION_TITLE_CHANGE } from 'src/types';
import User from 'src/types/User';
import LocalMap from 'src/map';
import { Vehicle } from 'src/types/vehicle';

interface IHomeProps {
    user?: User,
    title?: string,
    setApplicationTitle?: (title: string) => unknown,
    notify: (message: string | IMessage, title?: string) => unknown
    classes: any,
    vehicles?: Vehicle[]
}

class Home extends React.PureComponent<IHomeProps> {

    constructor(props: IHomeProps) {
        super(props)
        let { setApplicationTitle, title, user } = this.props
        if (setApplicationTitle && title && user) setApplicationTitle(`<i>${user.username}</i> - ${title}`)

    }

    render() {
        return (
            <div className='Home'>
                <LocalMap vehicles={this.props.vehicles || []} style={{ flex: 1 }} />
            </div>
        )
    }
}

export default connect((state: ILocalStore, ownProps: any) => {
    return {
        user: state.user,
        applicationTitle: state.title,
        vehicles: state.vehicles
    }
}, (dispatch: Dispatch, ownProps: any) => {
    return {
        notify: notify(dispatch),
        setApplicationTitle: (title: string) => {
            dispatch({ type: APPLICATION_TITLE_CHANGE, body: title })
        }
    }
})(Home)