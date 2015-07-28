(function() {

  return {
    events: {
    	'orgsGetRequest.done':'showOrgsList',
    	'orgsGetRequest.fail':'showError',
    	'bulkDeleteOrgsRequest.done':'showConfirmation',
    	'bulkDeleteOrgsRequest.fail':'showError',
    	'click .submit':'deleteOrgs',
        'click .closeModal':'getOrgs',
    	'pane.activated':'getOrgs'
    },

    requests: {
    	orgsGetRequest: function() {
    		return {
    			url: '/api/v2/organizations.json',
    			type: 'GET',
    			dataType: 'json'
    		}
    	},

    	bulkDeleteOrgsRequest: function(ids) {
    		return {
    			url: '/api/v2/organizations/destroy_many.json?ids=' + ids,
    			type: 'DELETE',
    			dataType: 'json'
    		}
    	}
    },

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

    showError: function() {
    	this.switchTo('error');
    },

    getOrgs: function() {
    	this.ajax('orgsGetRequest');
    },

    formatDates: function(data) {
    	for (var i=0; i<data.organizations.length; i++)
    	{
    		var d = new Date(data.organizations[i].created_at);
    		data.organizations[i].created_at = d.toLocaleDateString();
    	}
    	return data;
    },

    sortOrgs: function(data) {
    	data.organizations.sort(function(a,b){return new Date(b.created_at) - new Date(a.created_at)});
    	return data;
    },

    /*
    deleteOrgs: function() {
    	console.log("Go time");
    	var checkedOrgs = this.$('.deletion:checked'),
    		idsForDeletion = "";
    	if (confirm("Are you sure you want to delete " + checkedOrgs.length + " Orgs? This action cannot be undone.")) {
    		for (var i=0; i<checkedOrgs.length; i++) {
    			idsForDeletion = idsForDeletion + checkedOrgs[i].value + ',';
    		}
    		idsForDeletion = idsForDeletion.slice(0,-1);
    		this.ajax('bulkDeleteOrgsRequest', idsForDeletion);
    	}
    },
    */

    deleteOrgs: function() {
        console.log('Go time');
        var checkedOrgs = this.$('.deletion:checked'),
            confirmationParagraph = '<p>Are you sure you want to delete ' + checkedOrgs.length + ' Orgs? This action cannot be undone.</p>'

        if (checkedOrgs.length > 1) {
            this.$('.modal-body').append(confirmationParagraph);
            this.$('#confirmModal').modal();
        } else {
            this.$('#zeroModal').modal();
        }
        
        
    },


    showConfirmation: function() {
    	this.getOrgs();
    	alert('Done');
    }
  };

}());