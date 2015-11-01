(function() {

	return {
		events: {
			'orgsGetRequest.done':'showOrgsList',
			'orgsGetRequest.fail':'showError',
			'bulkDeleteOrgsRequest.done':'checkDeletionStatus',
			'bulkDeleteOrgsRequest.fail':'showError',
			'checkDeletionStatusRequest.done':'checkDeletionStatus',
			'checkDeletionStatusRequest.fail':'showError',
			'click .submit':'showModal',
			'click .confirmDelete':'deleteOrgs',
			'click #closeConfirmModal':'removeParagraph',
			'pane.activated':'getOrgs'
		},

		requests: {
			// GET all of the orgs in the account
			orgsGetRequest: function() {
				return {
					url: '/api/v2/organizations.json',
					type: 'GET',
					dataType: 'json'
				};
			},

			// Delete all orgs identified by the ids variable
			bulkDeleteOrgsRequest: function(ids) {
				return {
					url: '/api/v2/organizations/destroy_many.json?ids=' + ids,
					type: 'DELETE',
					dataType: 'json'
				};
			},

			// Check the status of job identified by the id variable
			checkDeletionStatusRequest: function(id) {
				return {
					url: '/api/v2/job_statuses/' + id,
					type: 'GET',
					dataType: 'json'
				};
			},

			makeCall: function(url) {
				return {
					url: url,
					type: 'GET',
					dataType: 'json'
				};
			}
		},

		// Get all the orgs, sort by newest first, format the dates, and display on a table
		showOrgsList: function(data) {
			console.log("here's the stuff");
			console.log(data);
			var orgsList = data.organizations;
			if (data.next_page != null) {
				var checkAgain = this.ajax('makeCall', data.next_page);

				this.when(checkAgain).done(function(response){
					orgsList = orgsList.concat(response.organizations);
					console.log('response orgs');
					console.log(response.organizations)
					console.log('added more');
					console.log(orgsList);
					if (response.next_page != null) {
						data = response;
						checkAgain = this.ajax('makeCall', data.next_page);
					} else {
						console.log('out of the if');
						console.log(orgsList);

						this.switchTo('page');
						this.sortOrgs(orgsList);
						this.formatDates(orgsList);
						var table = this.$('#org-table')[0],
							countPar = 'You currently have ' + orgsList.length + ' Orgs in your account:';
						this.$('#count-par').append(countPar);
						for (var i=0;i<orgsList.length;i++) {
							var row = '<tr><td>' + orgsList[i].name + '</td><td>' + orgsList[i].created_at + '</td><td><input type="checkbox" class="deletion" value="' + orgsList[i].id + '"></input></td></tr>';
							this.$('#org-table tr:last').after(row); 
						}
					}
				})
			}


		},

		// Display the error page
		showError: function() {
			this.switchTo('error');
		},

		// Call the GET request
		getOrgs: function() {
			this.ajax('orgsGetRequest');
		},

		// Sort the table rows by org created date, newest first
		sortOrgs: function(orgsList) {
			orgsList.sort(function(a,b){return new Date(b.created_at) - new Date(a.created_at);});
			return orgsList;
		},

		// Change the date format to locale readable form
		formatDates: function(orgsList) {
			for (var i=0; i<orgsList.length; i++)
			{
				var d = new Date(orgsList[i].created_at);
				orgsList[i].created_at = d.toLocaleDateString();
			}
			return orgsList;
		},

		// Show appropriate modal
		showModal: function() {
			var checkedOrgs = this.$('.deletion:checked'),
				confirmationParagraph = '<p id="confirmationParagraph">Are you sure you want to delete ' + checkedOrgs.length + ' Orgs? This action cannot be undone.</p>';

			if (checkedOrgs.length > 0) {
				this.$('#confirm-modal-body').append(confirmationParagraph);
				console.log('added par');
				this.$('#confirmModal').modal();
			} else {
				this.$('#zeroModal').modal();
			}			
		},

		// Collect IDs for deletion, and make request
		deleteOrgs: function() {
			console.log('Go time');
			var checkedOrgs = this.$('.deletion:checked'),
				idsForDeletion = "";

			for (var i=0; i<checkedOrgs.length; i++) {
				idsForDeletion = idsForDeletion + checkedOrgs[i].value + ',';
			}

			idsForDeletion = idsForDeletion.slice(0,-1);
			services.notify('Deleting...','notice',1000);
			this.ajax('bulkDeleteOrgsRequest', idsForDeletion);
		},

		// Check the job status until complete, then confirm
		// Scope of the AJAX request is bound, and requests are retried every 0.05s
		checkDeletionStatus: function(response) {
			var job_status = response.job_status;
			
			if (job_status.status == 'completed') {
				this.showConfirmation();
			} else {
				var boundRequest = this.ajax.bind(this); 
				setTimeout(function(){
					boundRequest('checkDeletionStatusRequest', job_status.id);
				}, 50);
			}
		},

		// Remove the confirmation paragraph if the modal is closed
		removeParagraph: function () {
			console.log('remove par');
			var cp = this.$('#confirmationParagraph')[0];
			console.log(cp);
			cp.parentNode.removeChild(cp);
		},

		// Show the confirmation modal
		showConfirmation: function() {
			console.log('confirm time');
			services.notify('Selected orgs deleted');
			this.ajax('orgsGetRequest');
		}
	};

}());