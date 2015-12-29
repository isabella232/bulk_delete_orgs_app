(function() {

	return {
		events: {
			'orgsGetRequest.done':'checkForMoreOrgs',
			'orgsGetRequest.fail':'showError',
			'orgsGetRequestPaginated.done':'checkForMoreOrgs',
			'orgsGetRequestPaginated.fail':'showError',
			'bulkDeleteOrgsRequest.done':'checkDeletionStatus',
			'bulkDeleteOrgsRequest.fail':'showError',
			'checkDeletionStatusRequest.done':'checkDeletionStatus',
			'checkDeletionStatusRequest.fail':'showError',
			'click .submit':'showModal',
			'click .confirmDelete':'deleteOrgs',
			'click #closeConfirmModal':'removeParagraph',
			'click .toggle-button':'togglePage',
			'click #reload-orgs':'getOrgs',
			'click #select-page':'selectPage',
			'click #select-all': 'selectAll',
			'click #clear-all': 'clearAll',
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

			// GET all of the orgs in the account
			orgsGetRequestPaginated: function(pid) {
				return {
					url: '/api/v2/organizations.json?page=' + pid,
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

		// Call the GET request
		getOrgs: function() {
			this.store({'orgs': []});
			services.notify('Getting your orgs...','notice',1000);
			this.ajax('orgsGetRequest');
		},

		// After making the GET request, check if there are more pages
		checkForMoreOrgs: function(data) {			
			console.log(data);

			var orgsSoFar = this.store('orgs');
			orgsSoFar = orgsSoFar.concat(data.organizations);
			this.store({'orgs': orgsSoFar});

			if (!data.next_page) {
				this.showOrgsList();
			} else {
				var pageID = data.next_page.slice(-1);
				this.ajax('orgsGetRequestPaginated', pageID);
			}

			console.log(this.store('orgs'));
		},

		// Display the orgs on a table
		showOrgsList: function(data) {
			this.switchTo('page');
			var orgsArray = this.store('orgs'),
				orgsArrayLength = orgsArray.length,
				TABLE_SIZE = 50,
				numTables = Math.ceil(orgsArrayLength/TABLE_SIZE),
				table,
				row,
				button;

			this.sortOrgs(orgsArray);
			this.formatDates(orgsArray);

			for (var i=0; i<numTables; i++) {
				table = '<table id="org-table-' + (i+1) + '" class="table table-bordered org-table hidden"><tr><th class="col-md-4">Name</th><th class="col-md-2">Created on</th><th class="col-md-2">Delete</th></tr></table>';
				this.$('#table-area').append(table);
			}

			for (var j=0; j<numTables; j++) {
				for (var k=j*TABLE_SIZE; k<Math.min((j+1)*TABLE_SIZE,orgsArrayLength); k++) {
					row = '<tr><td class="col-md-4">' + orgsArray[k].name + '</td><td class="col-md-2">' + orgsArray[k].created_at + '</td><td class="col-md-2"><input type="checkbox" class="deletion" value="' + orgsArray[k].id + '"></input></td></tr>';
					this.$('#org-table-' + (j+1) + ' tr:last').after(row);
				}
			}

			for (var l=0; l<numTables; l++) {
				button = '<li class = "toggle-li" id="toggle-li-' + (l+1) + '"><a id="toggle-button-' + (l+1) + '" class="toggle-button">' + (l+1) + '</a></li>';
				this.$('#page-selector').append(button);
			}

			this.$('#org-table-1').removeClass('hidden').addClass('shown');
			this.$('#toggle-li-1').addClass('active');
		},

		// Sort the table rows by org created date, newest first
		sortOrgs: function(orgs) {
			orgs.sort(function(a,b){return new Date(b.created_at) - new Date(a.created_at);});
			return orgs;
		},

		// Change the date format to locale readable form
		formatDates: function(orgs) {
			for (var i=0; i<orgs.length; i++)
			{
				var d = new Date(orgs[i].created_at);
				orgs[i].created_at = d.toLocaleDateString();
			}
			return orgs;
		},

		togglePage: function(event) {
			var buttonNum = event.target.id.slice(-1);

			this.$('.org-table').removeClass('shown').addClass('hidden');
			this.$('#org-table-' + buttonNum).removeClass('hidden').addClass('shown');
			this.$('.toggle-li').removeClass('active');
			this.$('#toggle-li-' + buttonNum).addClass('active');
		},

		// Display the error page
		showError: function() {
			this.switchTo('error');
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
				idsForDeletion = '';

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
			} else if (job_status.status == 'failed') {
				this.showError();
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
		},

		selectPage: function() {
			this.$('.shown .deletion').prop('checked', true);
		},

		selectAll: function() {
			this.$('.deletion').prop('checked', true);
		},

		clearAll: function() {
			this.$('.deletion').prop('checked', false);
		}
	};

}());