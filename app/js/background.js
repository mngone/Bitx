/*
 * Background script of the Chrome extension
 * Loaded by background.html
 */
window.onload = function() {
  var userLang = (navigator.language) ? navigator.language : navigator.userLanguage;
  var locale = userLang.substring(0,2);
  var refresh_period;
  if (!localStorage.language) {
    localStorage.language = locale;
  }
  if (!localStorage.counter_todos) {
    localStorage.counter_todos = 'default';
  }
  if (localStorage.refresh_period) {
    refresh_period = localStorage.refresh_period;
  } else {
    refresh_period = 5000;
    localStorage.refresh_period = refresh_period;
  }
  if (localStorage.myTodos) {
    var myTodos = JSON.parse(localStorage.myTodos);
    badge.updateBadge(myTodos);
  }
  setInterval(getTodos, refresh_period);
};

/*
 * Retrieve the Basecamp account that supports the last APIs
 * Store data in localStorage
 */
function getAuthorization() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://launchpad.37signals.com/authorization.json', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.basecampToken);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        localStorage.basecampId = _.findWhere(data.accounts, {product: "bcx"}).id;
        getUser();
        console.log('LOG: getAuthorization XHR');
      } else if (xhr.readyState === 4) {
        // Token expired
        console.log('ERROR: getAuthorization XHR - Token expired');
        window.oauth2.renew();
      }
    };
    xhr.send();
  } catch(e) {
    console.log(e);
  }
}

/*
 * Retrieve the User ID within the Basecamp organization
 * Store data in localStorage
 */
function getUser() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://basecamp.com/' + localStorage.basecampId + '/api/v1/people/me.json', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.basecampToken);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 304)) {
        var data = JSON.parse(xhr.responseText);
        localStorage.userId = data.id;
        console.log('LOG: getUser XHR');
      } else if (xhr.readyState === 4) {
        console.log('ERROR: getUser XHR');
      }
    };
    xhr.send();
  } catch(e) {
    console.log(e);
  }
}

/*
 * Retrieve the all Todos from projects where user is involved
 * Store data in Chrome storage
 */
function getTodos() {
  if (localStorage.basecampToken == undefined) return;

  var allTodos = [];
  var myTodos = [];
  var noCache;

  $.ajax({
    url: 'https://basecamp.com/' + localStorage.basecampId + '/api/v1/todolists.json',
    headers:  {'Authorization':'Bearer ' + localStorage.basecampToken}
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    getAuthorization();
  })
  .done(function(data, textStatus, jqXHR) {
    chrome.storage.local.get('assignedTodos', function(data) {
      if (_.isEmpty(data.assignedTodos)) {
        noCache = true;
      }
    });
    if (jqXHR.getResponseHeader('Status') == '200 OK' || noCache || !localStorage.myTodos || localStorage.updateBadge == 'true') {
      $.when(asyncEvent(data)).done(function(allTodolists) {
        _.forEach(allTodolists, function (todolist) {
          _.forEach(todolist.todos.remaining, function(todo) {
            todo.todolist = todolist.name;
            todo.project = todolist.project;
            todo.project_id = todolist.project_id;
            allTodos.push(todo);
            if (todo.assignee && todo.assignee.id == localStorage.userId)
              myTodos.push(todo);
          });
        });

        allTodos = _.chain(allTodos).sortBy(function(todo) { return todo.id; })
                    .sortBy(function(todo) { return todo.project_id; })
                    .value();
        console.log('LOG: getTodos updates cache of allTodos');
        chrome.storage.local.set({'assignedTodos': JSON.stringify(allTodos)});

        // Create notification
        if (localStorage.myTodos) {
          var localMyTodos = JSON.parse(localStorage.myTodos);
          _.each(myTodos, function(item) {
            if (!_.findWhere(localMyTodos, {id: item.id})) { // Check each todo whether it is new or not
              var projectName = _.findWhere(data, {id: item.todolist_id}).bucket.name;
              var notification = webkitNotifications.createNotification(
                item.creator.avatar_url, // Icon
                projectName, // Title
                item.content // Body
              );
              notification.onclick = function () {
                window.open('https://basecamp.com/' + localStorage.basecampId + '/projects/' + item.project_id + '/todos/' + item.id);
                notification.close();
              };
              notification.show();
              setTimeout(function() { notification.cancel(); }, 15000); // Hide notificiation after 15 seconds
            }
          });
        }

        // Update localStorage
        localStorage.myTodos = JSON.stringify(myTodos);
        badge.updateBadge(myTodos);
        console.log('LOG: getTodos updates cache of myTodos');
      });
    }
  });
}

function asyncEvent(todolists) {

  function checkIfModified(status) {
    if (--done === 0) {
      return deferred.resolve(allTodolists);
    }
  }

  var deferred = new jQuery.Deferred();
  var done = todolists.length;
  var allTodolists = [];

  _.each(todolists, function(todolist) {
    $.ajax({
      url: todolist.url,
      headers:  {'Authorization':'Bearer ' + localStorage.basecampToken}
    }).done(function(data, textStatus, jqXHR) {
      data.project_id = todolist.bucket.id;
      data.project = todolist.bucket.name;
      allTodolists.push(data);
      checkIfModified();
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.log('ERROR: GET request failed');
      chrome.storage.local.remove('assignedTodos');
    });
  });

  return deferred.promise();

}