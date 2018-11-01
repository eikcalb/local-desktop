import * as React from "react"
import { FormGroup } from "@material-ui/core";

export interface IRegisterProps {
    form?: string
}

export class Register extends React.PureComponent<IRegisterProps, any>{
    render() {
        return (
            <div className="Register">
            <FormGroup  ></FormGroup>
                <input type="text" name="username" placeholder="username" />
                <input type='mail' name="email" placeholder="email address" />
                <input type='tel' name="phone" placeholder="phone number" />
                
                <input type="password" placeholder="password" />
                <input type="vpassword" placeholder="password" />
                
            </div>
        )
    }
}

