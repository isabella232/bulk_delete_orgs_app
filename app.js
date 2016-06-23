(function() {

  var timedStatusCheck,
      allOrgs,
      numTables;

  return {
    events: {
      'pane.activated':'init',
      'app.willDestroy':'stopTimeOut',
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
      'click #reload-orgs':'startAgain',
      'click #select-page':'selectPage',
      'click #select-all': 'selectAll',
      'click #clear-all': 'clearAll'
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

      // GET page pid of the orgs list
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
      }
    },

    // Initialise: make a GET request for the orgs if an admin, and show a message if not
    init: function() {
      if (this.currentUser().role() == 'admin') {
        this.switchTo('loading');
        this.ajax('orgsGetRequest');
      } else {
        this.switchTo('non-admin');
      }
      
    },

    // After making the GET request, check if there are more pages
    checkForMoreOrgs: function(data) {      
      var orgsSoFar = allOrgs||[],
        eqaulIndex,
        pageNum,
        totalPages = Math.ceil(data.count/100),
        barPercent;

      orgsSoFar = orgsSoFar.concat(data.organizations);
      allOrgs = orgsSoFar;

      if (!data.next_page) {
        this.showOrgsList();
      } else {
        eqaulIndex = data.next_page.indexOf("=");
        pageNum = data.next_page.slice(eqaulIndex+1);
        barPercent = 100*pageNum/totalPages;
        this.$('.bar').css('width', barPercent + "%");
        this.ajax('orgsGetRequestPaginated', pageNum);
      }
    },

    // Display the orgs on a table
    showOrgsList: function(data) {
      this.switchTo('page');

      var orgsArray = allOrgs,
        orgsArrayLength = orgsArray.length,
        TABLE_SIZE = 50,
        table,
        row,
        button;

      numTables = Math.ceil(orgsArrayLength/TABLE_SIZE);
      this.sortOrgs(orgsArray);
      this.formatDates(orgsArray);

      for (var i=0; i<numTables; i++) {
        table = '<table id="org-table-' + (i+1) + '" class="table table-bordered org-table hidden"><tr><th class="org-name-head">Name</th><th class="created-head">Created on</th><th class="mark-head">Mark for deletion</th></tr></table>';
        this.$('#table-area').append(table);
      }

      for (var j=0; j<numTables; j++) {
        for (var k=j*TABLE_SIZE; k<Math.min((j+1)*TABLE_SIZE,orgsArrayLength); k++) {
          row = '<tr><td class="org-name-cell">' + orgsArray[k].name + '</td><td class="created-cell">' + orgsArray[k].created_at + '</td><td class="mark-cell"><input type="checkbox" class="deletion" value="' + orgsArray[k].id + '"></input></td></tr>';
          this.$('#org-table-' + (j+1) + ' tr:last').after(row);
        }
      }
      
      if (numTables<=10) {
        this.buildSmallPaginator();
      } else {
        this.buildLargePaginator();
      }
    },

    // Sort the table rows by org created date, newest first
    sortOrgs: function(orgs) {
      orgs.sort(function(a,b){return new Date(b.created_at) - new Date(a.created_at);});
      return orgs;
    },

    // Change the date format to locale readable form
    formatDates: function(orgs) {
      var d;
      for (var i=0; i<orgs.length; i++)
      {
        d = new Date(orgs[i].created_at);
        orgs[i].created_at = d.toLocaleDateString();
      }
      return orgs;
    },

    // Builds a simple paginator for 10 or less pages
    buildSmallPaginator: function() {
      var button;

      for (var l=0; l<numTables; l++) {
        button = '<li class = "toggle-li toggle-li-' + (l+1) + '"><a class="toggle-button toggle-button-' + (l+1) + '">' + (l+1) + '</a></li>';
        this.$('.bdo-pagination').append(button);
      }

      this.$('#org-table-1').removeClass('hidden').addClass('shown');
      this.$('.toggle-li-1').addClass('active');
    },

    // Builds a paginator for over 10 pages, shows only 9 page numbers and hides the rest 
    buildLargePaginator: function() {
      var button;
      
      for (var l=0; l<numTables; l++) {
        button = '<li class = "toggle-li toggle-li-' + (l+1) + '"><a class="toggle-button toggle-button-' + (l+1) + '">' + (l+1) + '</a></li>';
        this.$('.bdo-pagination').append(button);
      }

      this.$(".bdo-pagination-top > li:eq( 1), .bdo-pagination-bottom > li:eq( 1)").after( '<li class="ellipses ellipses-left"><a>...</a></li>');
      this.$(".bdo-pagination-top > li:eq(-2), .bdo-pagination-bottom > li:eq(-2)").before('<li class="ellipses ellipses-right"><a>...</a></li>');

      this.$('#org-table-1').removeClass('hidden').addClass('shown');
      this.$('.toggle-li, .ellipses').hide();
      this.$('.toggle-li-1, .toggle-li-2, .toggle-li-3, .toggle-li-4, .toggle-li-5, .toggle-li-6, .toggle-li-7, .toggle-li-' + (numTables-1) + ', .toggle-li-' + numTables + ', .ellipses-right').show();
      this.$('.toggle-li-1').addClass('active');
    },

    // Display table number correlating to clicked button, and hide the rest
    togglePage: function(event) {
      var buttonNum = parseInt(event.target.className.slice(event.target.className.indexOf('toggle-button-') + 14), 10);

      this.$('.org-table').removeClass('shown').addClass('hidden');
      this.$('#org-table-' + buttonNum).removeClass('hidden').addClass('shown');
      this.$('.toggle-li').removeClass('active');
      this.$('.toggle-li-' + buttonNum).addClass('active');

      if (buttonNum <= 5) {
        this.$('.toggle-li, .ellipses').hide();
        this.$('.toggle-li-1, .toggle-li-2, .toggle-li-3, .toggle-li-4, .toggle-li-5, .toggle-li-6, .toggle-li-7, .toggle-li-' + (numTables-1) + ', .toggle-li-' + numTables + ', .ellipses-right').show();
        this.$('.toggle-li-' + buttonNum).addClass('active');
      } else if (buttonNum <= (numTables - 5)) {
        this.$('.toggle-li, .ellipses').hide();
        this.$('.toggle-li-1, .toggle-li-2, .toggle-li-' + (buttonNum-2) + ', .toggle-li-' + (buttonNum-1) + ', .toggle-li-' + buttonNum + ', .toggle-li-' + (buttonNum+1) + ', .toggle-li-' + (buttonNum+2) + ', .toggle-li-' + (numTables-1) + ', .toggle-li-' + numTables + ', .ellipses-right, .ellipses-left').show();
        this.$('.toggle-li-' + buttonNum).addClass('active');
      } else if (buttonNum <= numTables) {
        this.$('.toggle-li, .ellipses').hide();
        this.$('.toggle-li-1, .toggle-li-2, .toggle-li-' + (numTables-6) + ', .toggle-li-'+(numTables-5)+', .toggle-li-' + (numTables-4) + ', .toggle-li-' + (numTables-3) + ', .toggle-li-' + (numTables-2) + ', .toggle-li-' + (numTables-1) + ', .toggle-li-' + numTables + ', .ellipses-left').show();
        this.$('.toggle-li-' + buttonNum).addClass('active');
      } else {
        this.showError();
      }
    },

    // Display the error page
    showError: function() {
      this.switchTo('error');
    },

    // Show appropriate modal
    showModal: function() {
      var checkedOrgs = this.$('.deletion:checked'),
        confirmationParagraph;

      if (checkedOrgs.length > 1) {
        confirmationParagraph = '<p id="confirmationParagraph">Are you sure you want to delete ' + checkedOrgs.length + ' orgs? This action cannot be undone.</p>';
        this.$('#confirm-modal-body').append(confirmationParagraph);
        this.$('#confirmModal').modal();
      } else if (checkedOrgs.length > 0) {
        confirmationParagraph = '<p id="confirmationParagraph">Are you sure you want to delete ' + checkedOrgs.length + ' org? This action cannot be undone.</p>';
        this.$('#confirm-modal-body').append(confirmationParagraph);
        this.$('#confirmModal').modal();
      } else {
        this.$('#zeroModal').modal();
      }     
    },

    // Collect IDs for deletion, and make request
    deleteOrgs: function() {
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
      if (response.job_status.status == 'completed') {
        this.showConfirmation();
      } else if (response.job_status.status == 'failed') {
        this.showError();
      } else {
        var boundRequest = this.ajax.bind(this); 
        timedStatusCheck = setTimeout(function(){
          boundRequest('checkDeletionStatusRequest', response.job_status.id);
        }, 50);
      }
    },

    //
    stopTimeOut: function() {
      clearTimeout(timedStatusCheck);
    },

    // Remove the confirmation paragraph if the modal is closed
    removeParagraph: function () {
      var cp = this.$('#confirmationParagraph')[0];
      cp.parentNode.removeChild(cp);
    },

    // Show the confirmation modal
    showConfirmation: function() {
      services.notify('Selected orgs deleted');
      this.init();
    },

    // Select all on current page
    selectPage: function() {
      this.$('.shown .deletion').prop('checked', true);
    },

    // Select all on every page
    selectAll: function() {
      this.$('.deletion').prop('checked', true);
    },

    // Deselect all on every page
    clearAll: function() {
      this.$('.deletion').prop('checked', false);
    },

    // Reload from the start by assigning an empty array to allOrgs and calling init() 
    startAgain: function() {
      allOrgs = [];
      this.init();
    }
  };
}());