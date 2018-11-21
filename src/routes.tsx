import { Route } from "react-router";
import * as React from 'react'

export const Links = {
    AUTHENTICATION: "/auth"
}

export default [
    <Route key={1} strict exact path={Links.AUTHENTICATION} />
]