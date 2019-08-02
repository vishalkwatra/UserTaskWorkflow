sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel"
], function(UIComponent, Device, JSONModel) {
	"use strict";

	return UIComponent.extend("tutorial.genericusertask.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();

			this.setModel(new JSONModel(Device).setDefaultBindingMode("OneWay"), "device");
			this.setModel(new JSONModel({taskDescription:""}), "app");

			// get task data
			var startupParameters = this.getComponentData().startupParameters;
			var taskModel = startupParameters.taskModel;
			var taskData = taskModel.getData();
			var taskId = taskData.InstanceID;

			// initialize model
			var contextModel = new JSONModel("/bpmworkflowruntime/rest/v1/task-instances/" + taskId + "/context")
				.attachRequestCompleted(function(oEvent) {
					// Create an array of property/value pairs for generic display in the UI
					var oModel = oEvent.getSource(),
						mControl = oModel.getProperty("/anubhavData/control"),
						mSource = oModel.getProperty(mControl.source),
						aFormData = mControl.properties.map(function(sProperty) {
							return {
								property: sProperty,
								value: mSource[sProperty]
							};
						});
					oModel.setProperty("/anubhavData/formItems", aFormData);
				});
			this.setModel(contextModel);

			// Ensure we have access to the Inbox API before continuing
			// (we don't except when running within the My Inbox context, ie
			// when running "for real", rather than in test mode).
			if (startupParameters.inboxAPI) {

				// get the task description
				var appModel = this.getModel("app");
				startupParameters.inboxAPI.getDescription("NA", taskId)
					.done(function(data){
	                	appModel.setProperty("/taskDescription", data.Description);
					})
					.fail(function(errorText){
	                	jQuery.sap.require("sap.m.MessageBox");
	                	sap.m.MessageBox.error(errorText, { title: "Error"});
	        		});

				//add actions
				startupParameters.inboxAPI.addAction({
					type: "Accept",
					label: "Complete"
				}, function() {
					this._completeTask(taskId, true);
				}, this);

			}
		},

		// Taken mostly straight out of the "Book Approval" tutorial for now
		_completeTask: function(taskId) {
			var token = this._fetchToken();
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
				method: "PATCH",
				contentType: "application/json",
				async: false,
				data: JSON.stringify({
					status: "COMPLETED",
					context: this.getModel().getData()
				}),
				headers: {
					"X-CSRF-Token": token
				}
			});
			this._refreshTask(taskId);
		},

		_fetchToken: function() {
			var token;
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/xsrf-token",
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function(result, xhr, data) {
					token = data.getResponseHeader("X-CSRF-Token");
				}
			});
			return token;
		},

		_refreshTask: function(taskId) {
			this.getComponentData().startupParameters.inboxAPI.updateTask("NA", taskId);
		}



	});
});