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
			orgsGetRequest: function() {
				return {
					url: '/api/v2/organizations.json',
					type: 'GET',
					dataType: 'json'
				};
			},

			bulkDeleteOrgsRequest: function(ids) {
				return {
					url: '/api/v2/organizations/destroy_many.json?ids=' + ids,
					type: 'DELETE',
					dataType: 'json'
				};
			},

			checkDeletionStatusRequest: function(id) {
				return {
					url: '/api/v2/job_statuses/' + id,
					type: 'GET',
					dataType: 'json'
				}
			}
		},

		// Get all the orgs, sort by newest first, format the dates, and display on a table
		showOrgsList: function(data) {
			this.switchTo('page');
			this.sortOrgs(data);
			this.formatDates(data);
			var table = this.$('#org-table')[0];
			console.log(data);
			for (var i=0;i<data.organizations.length;i++) {
				var row = '<tr><td>' + data.organizations[i].name + '</td><td>' + data.organizations[i].created_at + '</td><td><input type="checkbox" class="deletion" value="' + data.organizations[i].id + '"></input></td></tr>';
				this.$('#org-table tr:last').after(row); 
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

		// Change the date format to locale readable form
		formatDates: function(data) {
			for (var i=0; i<data.organizations.length; i++)
			{
				var d = new Date(data.organizations[i].created_at);
				data.organizations[i].created_at = d.toLocaleDateString();
			}
			return data;
		},

		// Sort the table rows by org created date, newest first
		sortOrgs: function(data) {
			data.organizations.sort(function(a,b){return new Date(b.created_at) - new Date(a.created_at);});
			return data;
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
			this.ajax('bulkDeleteOrgsRequest', idsForDeletion);
		},

		checkDeletionStatus: function(response) {
			var job_status = response.job_status;
			console.log('checking status...')
			
			if (job_status.status == 'completed') {
				this.showConfirmation;
			} else {
				setTimeout(function(){
					this.ajax('checkDeletionStatusRequest', job_status.id);
				}, 10)
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