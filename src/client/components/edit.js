/* Copyright G. Hemingway, @2018 */
"use strict";

import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  ErrorMessage,
  FormBase,
  FormInput,
  FormLabel,
  FormButton,
  ModalNotify
} from "./shared";
import { validPassword, validUsername } from "../../shared";
import $ from "jquery";

/*************************************************************************/

export class Edit extends Component {
  constructor(props) {
    super(props);
    //console.log(this.props.currentUser);
    this.state = {
      username: this.props.currentUser.username,
      first_name: this.props.currentUser.first_name,
      last_name: this.props.currentUser.last_name,
      city: this.props.currentUser.city,
      error: ""
    };

    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  onChange(ev) {
    // Update from form and clear errors
    this.setState({ [ev.target.name]: ev.target.value, error: "" });
  }

  onSubmit(ev) {
    ev.preventDefault();
    // Only proceed if there are no errors
    if (!this.state.hasOwnProperty("error") || this.state.error !== "") return;
    $.ajax({
      url: `/v1/user`,
      data: {
        first_name: this.state.first_name,
        last_name: this.state.last_name,
        city: this.state.city
      },
      method: "put",
      statusCode: {
        204: () => {
          console.log("updated user information");
          this.props.history.push(`/profile/${this.state.username}`);
        },
        401: function(err) {
          console.log("error: ",err.responseJSON);
        },
        400: function(err) {
          console.log("error: ",err.responseJSON);
        },
        500: function(err) {
          console.log("error: ",err.responseJSON);
        }
      }
    });
  }

  componentDidMount() {
    document.getElementById("first_name").focus();
  }

  render() {
    return (
      <div style={{ gridArea: "main" }}>
        <ErrorMessage msg={this.state.error} />
        <FormBase>
          <FormLabel htmlFor="first_name">First Name:</FormLabel>
          <FormInput
            id="first_name"
            name="first_name"
            placeholder={this.state.first_name}
            onChange={this.onChange}
            value={this.state.first_name}
          />

          <FormLabel htmlFor="last_name">Last Name:</FormLabel>
          <FormInput
            name="last_name"
            placeholder={this.state.last_name}
            onChange={this.onChange}
            value={this.state.last_name}
          />

          <FormLabel htmlFor="city">City:</FormLabel>
          <FormInput
            name="city"
            placeholder={this.state.city}
            onChange={this.onChange}
            value={this.state.city}
          />
          <div />
          <FormButton onClick={this.onSubmit}>Update</FormButton>
        </FormBase>
      </div>
    );
  }
}

Edit.propTypes = {
  history: PropTypes.object.isRequired
};
