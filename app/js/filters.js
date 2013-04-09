'use strict';

angular
  .module('basecampExtension.filters', [])

  /**
   * Filtering Todos by category
   * '1' - Overdue
   * '2' - Today
   * '3' - Upcoming
   * '4' - Undetermined
   */
  .filter('status', function($filter) {
    return function(input, status) {
      if(input) {
        var todayDate = new Date();
        todayDate.setHours(0,0,0,0);
        var inputDate = null;
        var out = [];
        for (var i = 0; i < input.length; i++) {
          if (input[i].due_at != null && status != '4') {
            inputDate = new Date(input[i].due_at);
            inputDate.setHours(0,0,0,0);
            if ((status == '1') && (inputDate.getTime() < todayDate.getTime())) {
              input[i].days_late =  $filter('daysLate')(input[i].due_at);
              out.push(input[i]);
            }
            else if ((status == '2') && (inputDate.getTime() == todayDate.getTime())) out.push(input[i]);
            else if ((status == '3') && (inputDate.getTime() > todayDate.getTime())) {
              input[i].remaining_days =  $filter('daysRemaining')(input[i].due_at);
              out.push(input[i]);
            }
          }
          else if (input[i].due_at == null && status == '4') out.push(input[i]);
        }
        return out;
      } else return [];
    };
  })

  /**
   * Determine elapsed time
   */
  .filter('elapsedTime', function() {
    var today = new Date();
    var lang = localStorage['language'];
    return function(input) {
      if(input) {
        var diff = today - new Date(input);
        if (diff/(1000*60*60*24) < 1) // If last update is less than one day ago
          if (diff/(1000*60*60) < 1) // If last update is less than one hour ago
            return Math.round(diff/(1000*60)) + " " + window[lang]['minutesAgo'];
          else return Math.round(diff/(1000*60*60)) + " " + window[lang]['hoursAgo'];
        else return Math.round(diff/(1000*60*60*24)) + " " + window[lang]['daysAgo'];
      } else return "";
    };
  })

  /**
   * Determine number of days remaining 
   */
  .filter('daysRemaining', function() {
    var today = new Date();
    return function(input) {
      if(input) return Math.round((new Date(input) - today)/(1000*60*60*24));
    };
  })

  /**
   * Determine number of days late
   */
  .filter('daysLate', function() {
    var today = new Date();
    return function(input) {
      if(input) return Math.round((today - new Date(input))/(1000*60*60*24));
    };
  })

  /**
   * Remove domain name of email address
   * (Just for display)
   */
  .filter('removeDomain', function() {
    return function(input) {
      if(input) return input.split("@")[0];
    };
  })

  /**
   * Advanced search that look through todos
   */
  .filter('keywordSearch', function($filter) {
    var out = [];
    var realSearch = "";
    return function(input, search) {
       if(search && input) {
        switch(true) {
          // If the keyword '@createdbyme' has been typed
          case (new RegExp("^@createdbyme", "gi")).test(search):
            console.log('@createdbyme');
            out = _.filter(input, function(item) {
              if ( item['creator']['id'] == localStorage['userId'] ) return true;
            });
            // If something follows '@createdbyme'
            // Look in the todo description or in the project name or in the todolist title
            if(search.indexOf(" ") != -1) {
              realSearch = search.substring(search.indexOf(" ") + 1);
              out = _.filter(out, function(item) { 
                if ( item['content'].match(new RegExp(realSearch, "gi"))
                    || item['project'].match(new RegExp(realSearch, "gi"))
                    || item['todolist'].match(new RegExp(realSearch, "gi")) ) return true;
              });
            }
            return out;
            break;          
          // If '@someone' has been type
          case (new RegExp("^@.+", "gi")).test(search):
            var user = _.find(angular.fromJson(localStorage['people']), function(user) {
              if ( user['email_address'].match(new RegExp(search.substring(1).split(" ")[0], "gi"))
                  || user['name'].match(new RegExp(search.substring(1), "gi")) )
                return true;
            });
            // If '@someone has been found, look for his todos'
            if (user) {
              out = _.filter(input, function(item) { 
                if ( item['assignee'] && item['assignee']['id'] == user.id ) return true;
              });
            } else return [];
            // If nothing follows '@someone'
            if(search.indexOf(" ") == -1) return out;
            // If something follows '@someone'
            // Look in the todo description or in the project name or in the todolist title
            else {
              realSearch = search.substring(search.indexOf(" ") + 1);
              out = _.filter(out, function(item) { 
                if ( item['content'].match(new RegExp(realSearch, "gi"))
                    || item['project'].match(new RegExp(realSearch, "gi"))
                    || item['todolist'].match(new RegExp(realSearch, "gi")) ) return true;
              });
              return out;
            }
            break;
          // If any word has been typed, load the regular search filter
          default:
            out = _.filter(input, function(item) {
              if ( item['assignee'] && item['assignee']['id'] == localStorage['userId'] ) return true;
            });
            return $filter('filter')(out, search);
        }
      // If nothing has been type
      } else {
        out = _.filter(input, function(item) {
          if ( item['assignee'] && item['assignee']['id'] == localStorage['userId'] ) return true;
        });
        return out;
      };
    };
  })


  /**
   * Advanced search that look through people of Basecamp account
   */
  .filter('suggestionSearch', function($filter) {
    var realSearch = "";
    var out = []
    return function(input, search) {
      if (new RegExp("^@", "gi").test(search)) {
        realSearch = search.substring(1);
        // Use a custom filter function to give more relevant suggestion
        out = _.filter(input, function(item) {
          if ( item['name'].match(new RegExp("^" + realSearch, "gi"))
              || item['email_address'].match(new RegExp("^" + realSearch, "gi")) ) return true;
        });      
        return out;
      }
    }
  });