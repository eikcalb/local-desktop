import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@material-ui/core";
import * as React from "react";
import { MdCancel } from "react-icons/md";
import { connect } from "react-redux";
import { Redirect } from "react-router";
import { Dispatch } from "redux";
import Auth from ".";
import ILocalStore from "../store";
import { REGISTER } from "../types";
import User from "../types/User";
import { Tracker, Target } from "../tracker";

export interface IRegisterProps {
    auth: Auth,
    canCancel: boolean,
    classes: any,
    history?: any,
    match?: any,
    location?: any,
    dialogContainer?: React.ReactInstance,
    registerCallback?: (user: User) => any
}

const EMAIL_REGEX = new RegExp(/^\S+@\S+/)

/**
 * Set the `from` property on the `location.state` the `Route` component object to redirect after registration or cancelled registration.
 * If registration is cancelled, the `state` object will contain a `registrationCancel` property set to `true`
 */
export class Register extends React.Component<IRegisterProps, any>{
    state = {
        password: '',
        passwordVerify: '',
        username: '',
        email: '',
        error: false,
        errorText: '',
        loading: false,
        registrationSuccess: false,
        cancel: false,
        trackerDone: false,
        showTracker: false,
        trackerData: null
    }

    constructor(props: IRegisterProps) {
        super(props)
        console.log("Register modal created: ", props)
    }

    render() {
        if (this.state.registrationSuccess) {
            if (this.props.location.state && this.props.location.state.from) {
                let { from } = this.props.location.state
                return (<Redirect to={from} />)
            }
            return (<Redirect to={{ pathname: '/' }} />)
        }
        else if (this.state.cancel) {
            if (this.props.location.state && this.props.location.state.from) {
                let { from } = this.props.location.state
                return (<Redirect to={{ ...from, state: { ...from.state, registrationCancel: true } }} />)
            }
            return (<Redirect to={{ pathname: '/', state: { registrationCancel: true } }} />)
        } else return (
            <Dialog className="Register"
                BackdropProps={{ style: { position: 'absolute' } }} container={this.props.dialogContainer}
                PaperProps={this.state.error ? { style: { animationName: 'shake', animationDuration: '900ms', animationFillMode: 'both', maxWidth: '30em', flex: 1 } } : { style: { maxWidth: '30em', flex: 1 } }}
                classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                disableBackdropClick disableEscapeKeyDown
                scroll='body' onClose={() => null} open={!this.state.showTracker}>
                <DialogTitle>Enter Login Details
                    <IconButton style={{ position: 'absolute', top: 3, right: 0 }} hidden={!this.props.canCancel} onClick={() => { this.setState({ cancel: true }) }} >
                        <MdCancel fill='#f00' />
                    </IconButton></DialogTitle>
                <DialogContent>
                    <Typography variant='caption' color='error' hidden={!this.state.error && !this.state.errorText} paragraph >
                        {this.state.errorText}
                    </Typography>
                    <TextField error={this.state.error} onChange={({ target: { value } }) => { this.setState({ username: value, error: !value }) }} required fullWidth variant='outlined' autoFocus margin='normal' label='Enter Username' type='text' name='username' />
                    <TextField error={this.state.error} onChange={({ target: { value } }) => { this.setState({ email: value, error: !value }) }} required fullWidth variant='outlined' margin='normal' label='Enter Email' type='email' name='email' />

                    <TextField error={this.state.error} onChange={({ target: { value } }) => {
                        this.setState(
                            { password: value, error: !value })
                    }} helperText={'Password should be at least 8 characters long!'} required fullWidth variant='outlined' margin='normal' label='Enter Password' type='password' name='password' />

                    <TextField error={this.state.error} onChange={({ target: { value } }) => {
                        this.setState(
                            { passwordVerify: value, error: !value })
                    }} helperText={'Should be the same as password!'} required fullWidth variant='outlined' margin='normal' label='Verify Password' type='password' name='passwordVerify' />
                    <DialogActions>
                        <Button fullWidth variant='raised' color='default'
                            onClick={() => this.setState({ showTracker: true })} >
                            Start Facial Recognition!
                        </Button>
                        <Button fullWidth disabled={this.state.error || this.state.loading || !this.state.trackerDone}
                            variant={'raised'} color='primary'
                            onClick={async () => {
                                let { password, passwordVerify, email, username, trackerData } = this.state
                                if (password !== '' && password.trim() !== '' && password.length >= 8 && password === passwordVerify && !this.state.loading && EMAIL_REGEX.test(email) && username && this.state.trackerDone && trackerData) {
                                    this.setState({ loading: true })
                                    let user: any
                                    try {
                                        if (this.props.auth && (user = await this.props.auth.registerSuperUser(username, email, password, trackerData))) {
                                            if (this.props.registerCallback) {
                                                this.props.registerCallback(user)
                                            }
                                            this.setState({ loading: false, registrationSuccess: true })
                                            return
                                        }
                                    } catch (e) {
                                        this.setState({ error: true, loading: false, errorText: e.message || e.target.error.message })
                                        console.log(e)
                                    }
                                }
                                this.setState({ error: true, loading: false, errorText: 'Ensure that you have provided the required values!' })
                            }}>
                            Login
                </Button>
                    </DialogActions>
                    <Tracker open={this.state.showTracker} dialogContainer={this.props.dialogContainer} track={Target.RECOGNIZE} detection="" recognize="" notify={m => null} callback={(param) => {
                        let trackerDone = param.success
                        this.setState({ trackerDone, showTracker: false, trackerData: param })
                    }} />
                </DialogContent>
            </Dialog >
        )
    }
}

export default connect((state: ILocalStore, ownProps: any) => {
    return {
        auth: state.auth
    }
}, (dispatch: Dispatch, ownProps: any) => {
    return {
        registerCallback: (user: User) => {
            dispatch({ type: REGISTER, body: user })
        }
    }
})(Register)

