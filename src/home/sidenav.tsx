import { Avatar, Badge, Collapse, Dialog, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemIcon, ListItemSecondaryAction, ListItemText, ListSubheader, Switch, Tooltip, Typography, Zoom } from '@material-ui/core';
import * as React from 'react';
import { FaCar, FaCaretDown, FaCaretUp, FaEmptySet, FaInfo, FaRetweet, FaUser } from 'react-icons/fa';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import ILocalStore, { getIDB } from 'src/store';
import { USERS_UPDATE_LIST, VEHICLES_UPDATE_LIST } from 'src/types';
import User, { getAllUsers } from 'src/types/User';
import { getAllVehicles, Vehicle } from 'src/types/vehicle';
import { SERVER_STAT_TYPES } from "../";
import { EventEmitter } from 'events';
const { networkInterfaces } = window.require('os');
const { getGlobal } = window.require('electron').remote


class RawSideNav extends React.PureComponent<any>{
    updateFrequency = 400

    state = {
        startServer: false,
        networkAddresses: [],
        openAboutDialog: false,
        openUsersDialog: false,
        openVehiclesDialog: false,
        openCollapsedAddresses: false,
        workerCount: 0
    }

    debounceTimers: { [key: string]: NodeJS.Timer | null } = {
        vehicle: null,
        user: null,
        worker: null
    }

    constructor(props: any) {
        super(props)
        this.props.refreshUsers()
        this.props.refreshVehicles()
        this.updateNetworkInterfaces()
        this.props.eventEmitter.on(SERVER_STAT_TYPES.SERVER_DELETE_VEHICLE, this.handleVehicleUpdate)
        this.props.eventEmitter.on(SERVER_STAT_TYPES.SERVER_NEW_VEHICLE, this.handleVehicleUpdate)
        this.props.eventEmitter.on(SERVER_STAT_TYPES.SERVER_NEW_USER, this.handleUserUpdate)
        this.props.eventEmitter.on(SERVER_STAT_TYPES.SERVER_NEW_WORKER, this.updateWorkerCount.bind(this))
        this.props.eventEmitter.on(SERVER_STAT_TYPES.SERVER_KILL_WORKER, this.updateWorkerCount.bind(this))
    }

    componentWillUnmount() {
        let { eventEmitter } = this.props as { eventEmitter: EventEmitter }
        eventEmitter.off(SERVER_STAT_TYPES.SERVER_DELETE_VEHICLE, this.handleVehicleUpdate)
        eventEmitter.off(SERVER_STAT_TYPES.SERVER_NEW_VEHICLE, this.handleVehicleUpdate)
        eventEmitter.off(SERVER_STAT_TYPES.SERVER_NEW_USER, this.handleUserUpdate)
        eventEmitter.off(SERVER_STAT_TYPES.SERVER_NEW_WORKER, this.updateWorkerCount.bind(this))
        eventEmitter.off(SERVER_STAT_TYPES.SERVER_KILL_WORKER, this.updateWorkerCount.bind(this))
    }

    handleVehicleUpdate(...args: any[]) {
        if (this.debounceTimers.vehicle) { clearTimeout(this.debounceTimers.vehicle); this.debounceTimers.vehicle = null; }
        this.debounceTimers.vehicle = setTimeout(this.props.refreshVehicles.bind(this), this.updateFrequency, ...args)
    }

    handleUserUpdate(...args: any) {
        if (this.debounceTimers.user) { clearTimeout(this.debounceTimers.user); this.debounceTimers.user = null }
        this.debounceTimers.user = setTimeout(this.props.refreshUsers.bind(this), this.updateFrequency, ...args)
    }

    updateWorkerCount() {
        this.setState({ workerCount: getGlobal('server').numberOfWorkers })
    }

    updateNetworkInterfaces() {
        let interfaces = networkInterfaces()
        let networkAddresses = []
        for (let interfaceName in interfaces) {
            let newAddresses = []
            //  Loops through all addresses in particular interface
            for (let networkInfo of interfaces[interfaceName]) {
                // If this interface is internal, exit interface loop
                if (networkInfo.internal) break
                newAddresses.push({ family: networkInfo.family, address: networkInfo.address })
            }

            if (newAddresses.length > 0) {
                networkAddresses.push({
                    name: interfaceName,
                    addresses: newAddresses
                })
            }
        }
        this.setState({ networkAddresses })
    }

    render() {

        return (
            <React.Fragment>

                <UsersListDialog onClose={() => { this.setState({ openUsersDialog: false }) }} open={this.state.openUsersDialog} users={this.props.users} classes={this.props.classes} dialogContainer={this.props.dialogContainer} />
                <VehiclesListDialog onClose={() => { this.setState({ openVehiclesDialog: false }) }} open={this.state.openVehiclesDialog} vehicles={this.props.vehicles} classes={this.props.classes} dialogContainer={this.props.dialogContainer} />
                <AboutDialog onClose={() => { this.setState({ openAboutDialog: false }) }} open={this.state.openAboutDialog} classes={this.props.classes} dialogContainer={this.props.dialogContainer} />
                <List component='nav'>
                    <Tooltip enterDelay={500} TransitionComponent={Zoom} disableTouchListener placement={'bottom-end'} title={'Shows a list of registered users along with associated details.'}>
                        <ListItem onClick={() => this.setState({ openUsersDialog: true })} dense button>
                            <ListItemIcon>
                                <Badge badgeContent={this.props.usersCount} color="secondary" >
                                    <FaUser />
                                </Badge>
                            </ListItemIcon>
                            <ListItemText primary={'View Users'} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={this.props.refreshUsers}>
                                    <FaRetweet />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </Tooltip>
                    <Tooltip enterDelay={500} TransitionComponent={Zoom} disableTouchListener placement={'bottom-end'} title={'Shows all registered vehicles.'}>
                        <ListItem onClick={() => this.setState({ openVehiclesDialog: true })} dense button>
                            <ListItemIcon>
                                <Badge badgeContent={this.props.vehiclesCount} color="secondary" >
                                    <FaCar />
                                </Badge>
                            </ListItemIcon>
                            <ListItemText primary={'View Vehicles'} />
                            <ListItemSecondaryAction>
                                <IconButton onClick={this.props.refreshVehicles}>
                                    <FaRetweet />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </Tooltip>
                </List>
                <Divider />
                <List component='nav'>
                    {/* <ListItem component={({ ...props }: LinkProps) => <Link {...props} to={Links.SETTINGS} />} dense button>
                        <ListItemIcon>
                            <FaCog />
                        </ListItemIcon>
                        <ListItemText primary={'Settings'} />
                    </ListItem> */}
                    <ListItem onClick={() => this.setState({ openAboutDialog: true })} dense button>
                        <ListItemIcon>
                            <FaInfo />
                        </ListItemIcon>
                        <ListItemText primary={'About'} />
                    </ListItem>
                </List>
                <Divider />
                <List subheader={(<ListSubheader component='p' >Network Information</ListSubheader>)} component='nav'>

                    <ListItem dense>
                        <Tooltip enterDelay={500} TransitionComponent={Zoom} disableTouchListener placement={'bottom-end'} title={'Refresh network information.'}>
                            <IconButton onClick={() => { this.updateNetworkInterfaces() }}>
                                <FaRetweet />
                            </IconButton>
                        </Tooltip>
                        <ListItemText primary={'Start Server'} />
                        <ListItemSecondaryAction>
                            <Switch checked={this.state.startServer} onChange={async () => {
                                let newState = !this.state.startServer
                                if (newState === true) {
                                    getGlobal('server').startServerCluster({ db: await getIDB(), auth: this.props.auth, eventEmitter: this.props.eventEmitter }, 40)
                                } else {
                                    getGlobal('server').stopCluster()
                                }
                                this.setState({ startServer: newState });
                            }} />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem button onClick={() => this.setState({ openCollapsedAddresses: !this.state.openCollapsedAddresses })} dense>
                        <ListItemText primary={`Cluster Count: ${this.state.workerCount}`} secondary={'This is the number of workers spawn for the application server.'} />
                        <ListItemIcon>
                            {this.state.openCollapsedAddresses ? <FaCaretUp /> : <FaCaretDown />}
                        </ListItemIcon>
                    </ListItem>
                    <Collapse in={this.state.openCollapsedAddresses}>
                        <List>
                            {this.state.networkAddresses.map((network: { name: string, addresses: any[] }) => (

                                <React.Fragment>
                                    <ListSubheader disableSticky={false}>{network.name}</ListSubheader>
                                    {network.addresses.map(address => (
                                        <ListItem style={{ alignContent: 'flex-start' }} dense>
                                            <ListItemText primary={address.address} secondary={address.family} />
                                        </ListItem>
                                    ))}

                                </React.Fragment>
                            ))}
                        </List>
                    </Collapse>

                </List>
            </React.Fragment>
        )
    }
}

const SideNav = connect(({ eventEmitter }: ILocalStore, ownProps: any) => {
    return {
        eventEmitter
    }
}, (dispatch: Dispatch, ownProps: any) => {
    return {
        refreshUsers: () => {
            getAllUsers().then(val => { dispatch({ type: USERS_UPDATE_LIST, body: val }) }).catch(err => console.error(err))
        },
        refreshVehicles: () => {
            getAllVehicles().then(val => { dispatch({ type: VEHICLES_UPDATE_LIST, body: val }) }).catch(err => console.error(err))
        }
    }
})(RawSideNav)

export default SideNav

export function UsersListDialog(props: any) {
    return (
        <Dialog className="UsersListDialog"
            BackdropProps={{ style: { position: 'absolute' } }} container={props.dialogContainer}
            classes={{ root: props.classes.dialogRoot, scrollBody: props.classes.dialogBody }}
            scroll='body' onClose={props.onClose} open={props.open}>
            <DialogTitle>User List</DialogTitle>
            <DialogContent>
                <List>
                    {props.users && props.users.length > 0 ? (
                        props.users.map((user: User) => {
                            return (
                                <ListItem>
                                    {user.profile ? (
                                        <ListItemAvatar>
                                            <Avatar alt={user.username} src={user.profileSrc} />
                                        </ListItemAvatar>
                                    ) : (
                                            <ListItemIcon>
                                                <FaUser />
                                            </ListItemIcon>
                                        )}
                                    <ListItemText primary={`${user.username}`} />
                                </ListItem>
                            )
                        })) : (
                            <ListItem>
                                <ListItemIcon>
                                    <FaEmptySet />
                                </ListItemIcon>
                                <ListItemText primary={'No user registered yet!'} />
                            </ListItem>
                        )}
                </List>
            </DialogContent>
        </Dialog >
    )
}

export function VehiclesListDialog(props: any) {
    return (<Dialog className="VehiclesListDialog"
        BackdropProps={{ style: { position: 'absolute' } }} container={props.dialogContainer}
        classes={{ root: props.classes.dialogRoot, scrollBody: props.classes.dialogBody }}
        scroll='body' onClose={props.onClose} open={props.open} >
        <DialogTitle>Vehicle List</DialogTitle>
        <DialogContent>
            <List>
                {props.vehicles && props.vehicles.length > 0 ? (props.vehicles.map((vehicle: Vehicle) => {
                    return (
                        <ListItem>
                            <ListItemIcon>
                                {Vehicle.getComponentForType(vehicle.type)}
                            </ListItemIcon>
                            <ListItemText primary={`${vehicle.vid}`} secondary={`${vehicle.brand} ${vehicle.model} (${vehicle.year}) owned by ${vehicle.user}, location: ${vehicle.location.latitude + ',' + vehicle.location.longitude}`} />
                        </ListItem>
                    )
                })) : (
                        <ListItem>
                            <ListItemIcon>
                                <FaEmptySet />
                            </ListItemIcon>
                            <ListItemText primary={'No vehicle registered yet!'} />
                        </ListItem>
                    )}
            </List>
        </DialogContent>
    </Dialog >)
}

export function AboutDialog(props: any) {
    return (<Dialog className="AboutDialog" container={props.dialogContainer}
        classes={{ root: props.classes.dialogRoot, scrollBody: props.classes.dialogBody }}
        scroll='body' onClose={props.onClose} open={props.open}>
        <DialogTitle>About</DialogTitle>
        <DialogContent>
            <Typography gutterBottom variant='body2'>
                Local-Desktop is a desktop server application for managing your fleet.<br />
                After starting the server, client applications can connect and update their location to synchronize data for use by administrators who can monitor traffic.
            </Typography>
            <List subheader={<ListSubheader>Credits</ListSubheader>}>
                <ListItem>
                    <ListItemText primary={'Agwa Israel Onome'} secondary={'Author/Programmer local-desktop'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={'OpenStreetMap Authors and Contributors'} secondary={'Map data'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={'NWJS Authors and Contributors'} secondary={'nw.js hybrid desktop development platform'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={'Material-ui'} secondary={'User Interface'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={'React-icons'} secondary={'Icon packs'} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={'Particle.js'} secondary={'Particle canvas background'} />
                </ListItem>
            </List>
            <Typography gutterBottom variant='caption'>
                &copy; Agwa Israel Onome {new Date().getFullYear()}
            </Typography>
        </DialogContent>
    </Dialog >)
}

// export function SettingsDialog(props: any) {
//     return (
//         <Dialog className="Tracker"
//             BackdropProps={{ style: { position: 'absolute' } }} container={this.props.dialogContainer}
//             classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
//             disableBackdropClick disableEscapeKeyDown
//             scroll='body' onClose={() => null} open={this.props.open}>
//             <DialogTitle>Center Your Face On The Camera!</DialogTitle>
//             <DialogContent>
//                 <div className="TrackerMedia">
//                     <video className={"FineVideo"} width={this.props.videoWidth || (MIN_VIDEO_WIDTH * 6)} height={this.props.videoHeight || (MIN_VIDEO_HEIGHT * 6)}
//                         id='v' poster={logo} onPause={() => this.running = false}
//                         onPlaying={() => this.running = true} onPlay={() => { this.run() }}
//                         src={isDebug() ? process.env.PUBLIC_URL + '/video.example.ogg' : ''}
//                         loop ref={this.getVideoRef} autoPlay
//                         style={{ objectFit: 'fill', zIndex: 1 }}>
//                         <track kind={'descriptions'} srcLang={'en-US'} default src={`${process.env.PUBLIC_URL}/vtt/detect.vtt`} />
//                     </video>
//                     <canvas id='c' ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'absolute', top: 0 }} />
//                     {/* <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} /> */}
//                     {/* <button onClick={this._onload.bind(this)} style={{ zIndex: 4, flex: 1, alignSelf: 'center' }} >Start Tracker</button> */}
//                 </div>
//                 <DialogActions>
//                     <Button fullWidth
//                         variant={'raised'} color='primary' disabled={!this.state.success || !this.result} onClick={() => {
//                             this.props.callback(this.result)
//                             return;
//                         }} >
//                         <MdCheckCircle />&emsp; Done
//                     </Button>
//                     <Button fullWidth
//                         variant={'raised'} color='secondary' hidden={!this.props.canCancel} onClick={() => { return this.props.callback(new TrackerResult(false, { message: "User cancelled facial recognition request!" })); }} >
//                         <MdCancel />&emsp; Cancel
//                     </Button>
//                 </DialogActions>

//             </DialogContent>
//         </Dialog >
//     )
// }