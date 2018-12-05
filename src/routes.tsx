import { Route } from "react-router";
import * as React from 'react'
import Home from "./home";

export const Links = {
    AUTHENTICATION: "/auth",
    HOME: "/home"
}

export default [
    <Route key={1} strict exact path={Links.AUTHENTICATION} />,
    <Route key={2} strict exact path={Links.HOME} component={Home} />
]