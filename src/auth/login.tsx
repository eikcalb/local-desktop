import * as React from "react"
import { TextField, InputAdornment, SvgIcon } from "@material-ui/core";
import { MdLock, MdPerson } from "react-icons/md";
export interface ILoginProps {
    form?: string
}

export class Login extends React.PureComponent<ILoginProps, any>{
    render() {
        return (
            <div className="Login">
                <InputAdornment position='start'>
                    <SvgIcon fontSize="small"><MdPerson /></SvgIcon>
                    <TextField fullWidth variant='outlined' type='text' name='username' label='Username' required />
                </InputAdornment>
                <input type="text" name="username" placeholder="username" />
                <InputAdornment position='start'>
                    <SvgIcon fontSize="small"><MdLock /></SvgIcon>
                    <TextField fullWidth variant='outlined' type='password' name='password' label='Password' required />
                </InputAdornment>
            </div>
        )
    }
}

