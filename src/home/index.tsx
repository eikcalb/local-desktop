import * as React from 'react'
import { connect } from 'react-redux';
import ILocalStore from 'src/store';

class Home extends React.Component {

    render() {
        return (
            <div className='Home'>

            </div>
        )
    }
}

export default connect((state: ILocalStore, ownProps: any) => {
    return {
        user: state.user
    }
})(Home)